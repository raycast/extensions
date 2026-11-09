// Detached helper: runs ffmpeg (screen -> HLS) and serves the HLS folder over HTTP.
// Usage: node streamer.js <bindIp> <allowedIp> <token> <dir> <ffmpegPath> <ffmpegArgsJson> <logFile>
//
// Access control: the server binds only to the interface facing the Cast device, picks a random
// port, only answers requests from the device's IP, and only under /<random token>/. The chosen
// port is written to <dir>/.port for the extension to read.
const { spawn } = require("child_process");
const { timingSafeEqual } = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");

const [bindIp, allowedIp, token, dir, ffmpegPath, argsJson, logFile] = process.argv.slice(2);
const types = { ".m3u8": "application/x-mpegURL", ".ts": "video/mp2t" };
const FILE_RE = /^[\w-]+\.(m3u8|ts)$/;

// ffmpeg's stderr goes to a log file so the extension can report why capture failed.
const log = fs.openSync(logFile, "w");
const ffmpeg = spawn(ffmpegPath, JSON.parse(argsJson), { stdio: ["ignore", "ignore", log] });
ffmpeg.on("exit", (code, signal) => {
  fs.appendFileSync(logFile, `\n[ffmpeg exited: code=${code} signal=${signal}]\n`);
  process.exit(0);
});
// SIGKILL: ffmpeg ignores SIGTERM while blocked waiting for capture frames, and HLS needs no clean shutdown.
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    ffmpeg.kill("SIGKILL");
    process.exit(0);
  });
}

function tokenOk(candidate) {
  const a = Buffer.from(candidate || "");
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deny(res) {
  res.writeHead(404);
  res.end();
}

/** Segment file names currently listed in the HLS playlist, oldest first. */
function playlistSegments() {
  try {
    return fs
      .readFileSync(path.join(dir, "index.m3u8"), "utf8")
      .split("\n")
      .filter((l) => FILE_RE.test(l.trim()) && l.trim().endsWith(".ts"))
      .map((l) => l.trim());
  } catch {
    return [];
  }
}
const segNum = (name) => Number((name.match(/(\d+)\.ts$/) || [])[1] ?? -1);

/**
 * live.ts: one endless MPEG-TS stream for DLNA TVs, which often can't play HLS. HLS segments are
 * MPEG-TS from the same encoder, so writing them back to back yields a valid continuous stream.
 */
function serveLive(req, res) {
  res.writeHead(200, {
    "Content-Type": "video/mpeg",
    "transferMode.dlna.org": "Streaming",
    "contentFeatures.dlna.org":
      "DLNA.ORG_PN=MPEG_TS_HD_NA_ISO;DLNA.ORG_OP=00;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000",
    "Cache-Control": "no-cache",
    Connection: "close",
  });
  if (req.method === "HEAD") return res.end();

  let last = null; // number of the last segment sent
  const tick = () => {
    const segs = playlistSegments();
    if (!segs.length) return;
    // Start at the newest segment to keep latency low, then follow along.
    const todo = last === null ? segs.slice(-1) : segs.filter((s) => segNum(s) > last);
    for (const name of todo) {
      try {
        res.write(fs.readFileSync(path.join(dir, name)));
        last = segNum(name);
      } catch {
        // segment rotated away between listing and reading; skip it
      }
    }
  };
  tick();
  const timer = setInterval(tick, 500);
  res.on("close", () => clearInterval(timer));
}

const server = http.createServer((req, res) => {
  const remote = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
  if (remote !== allowedIp || (req.method !== "GET" && req.method !== "HEAD")) return deny(res);

  const parts = new URL(req.url, "http://x").pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !tokenOk(parts[0]) || !FILE_RE.test(parts[1])) return deny(res);
  if (parts[1] === "live.ts") return serveLive(req, res);

  fs.readFile(path.join(dir, parts[1]), (err, data) => {
    if (err) return deny(res);
    res.writeHead(200, {
      "Content-Type": types[path.extname(parts[1])],
      "Content-Length": data.length,
      "Access-Control-Allow-Origin": "*", // required by the Cast receiver's player
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  });
});

server.listen(0, bindIp, () => {
  fs.writeFileSync(path.join(dir, ".port"), String(server.address().port), { mode: 0o600 });
});
