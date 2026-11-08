// server.js
import express from "express";
import sharp from "sharp";

const KEY = process.env.LASTFM_KEY;
const SIZE = 48;
const LF = "https://ws.audioscrobbler.com/2.0/";
const app = express();

app.get("/np", async (req, res) => {
  try {
    const user = encodeURIComponent(req.query.user || "");
    const r = await fetch(`${LF}?method=user.getrecenttracks&user=${user}&limit=1&api_key=${KEY}&format=json`);
    const t = (await r.json()).recenttracks?.track?.[0];
    if (!t) return res.json({ playing: false });

    const artist = t.artist["#text"];
    const playing = t["@attr"]?.nowplaying === "true";
    const cover = t.image?.find(i => i.size === "extralarge")?.["#text"] || "";

    let duration = 0;
    try {
      const i = await (await fetch(
        `${LF}?method=track.getinfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(t.name)}&api_key=${KEY}&format=json`
      )).json();
      duration = Math.round((+i.track?.duration || 0) / 1000);
    } catch {}

    res.json({ playing, title: t.name, artist, cover, duration });
  } catch { res.json({ playing: false }); }
});

app.get("/cover", async (req, res) => {
  try {
    const u = new URL(req.query.url);
    if (!/(\.|^)(last\.fm|fastly\.net)$/.test(u.hostname)) return res.sendStatus(400);
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    const data = await sharp(buf).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer();
    res.type("application/octet-stream").send(data); // 48*48*4 bytes RGBA
  } catch { res.sendStatus(500); }
});

app.listen(process.env.PORT || 3000);
