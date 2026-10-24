// Renders media/demo.gif from scene.html in headless Chrome, so nothing shows up
// on screen. Run: npm run demo
//
// Pass 1 renders the recorded region on its own and encodes it with the same
// ffmpeg settings as the extension (src/lib/encode.ts): that is the GIF the
// preview shows. Pass 2 renders the whole demo with that GIF playing inside.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = dirname(fileURLToPath(import.meta.url));
const build = join(here, "build");
const output = join(here, "..", "..", "media", "demo.gif");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ffmpeg = process.env.FFMPEG_PATH ?? "/opt/homebrew/bin/ffmpeg";
const CAPTURE_FPS = 30;
const DEMO_FPS = 15;
const INNER_FPS = 15;
const DEMO_WIDTH = 960;

function fresh(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  return dir;
}

const frameName = (dir, i) => join(dir, `${String(i + 1).padStart(4, "0")}.png`);

async function renderFrames(page, { from, to, fps, dir, capture, clip }) {
  const count = Math.round((to - from) * fps);
  for (let i = 0; i < count; i++) {
    await page.evaluate((t, c) => window.render(t, { capture: c }), from + i / fps, capture);
    await page.screenshot({ path: frameName(dir, i), clip });
  }

  return count;
}

function encodeInner(framesDir, gifPath) {
  const graph = [
    `fps=${INNER_FPS},scale='min(1000,iw)':-2:flags=lanczos,split[a][b]`,
    "[a]palettegen=stats_mode=diff[p]",
    "[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
  ].join(";");
  execFileSync(ffmpeg, [
    "-v",
    "error",
    "-y",
    "-framerate",
    String(CAPTURE_FPS),
    "-i",
    join(framesDir, "%04d.png"),
    "-vf",
    graph,
    "-loop",
    "0",
    gifPath,
  ]);
}

function encodeDemo(framesDir) {
  const graph = [
    `scale=${DEMO_WIDTH}:-2:flags=lanczos,split[a][b]`,
    "[a]palettegen=stats_mode=diff:max_colors=256[p]",
    "[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
  ].join(";");
  execFileSync(ffmpeg, [
    "-v",
    "error",
    "-y",
    "-framerate",
    String(DEMO_FPS),
    "-i",
    join(framesDir, "%04d.png"),
    "-vf",
    graph,
    "-loop",
    "0",
    output,
  ]);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--allow-file-access-from-files"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto(`file://${join(here, "scene.html")}`);
  await page.evaluate(() => document.fonts.ready);
  const { RECORDING, DURATION } = await page.evaluate(() => window.TIMELINE);

  const captureDir = fresh(join(build, "capture"));
  const { x, y, w, h } = RECORDING.rect;
  await renderFrames(page, {
    from: RECORDING.start,
    to: RECORDING.end,
    fps: CAPTURE_FPS,
    dir: captureDir,
    capture: true,
    clip: { x, y, width: w, height: h },
  });
  const innerGif = join(build, "inner.gif");
  encodeInner(captureDir, innerGif);

  const innerDir = fresh(join(build, "inner"));
  execFileSync(ffmpeg, ["-v", "error", "-i", innerGif, join(innerDir, "%04d.png")]);
  const count = readdirSync(innerDir).length;
  const probe = execFileSync(join(dirname(ffmpeg), "ffprobe"), [
    "-v",
    "error",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0",
    innerGif,
  ])
    .toString()
    .trim()
    .split(",");
  await page.evaluate((inner) => (window.__inner = inner), {
    dir: "build/inner",
    count,
    fps: INNER_FPS,
    size: statSync(innerGif).size,
    width: Number(probe[0]),
    height: Number(probe[1]),
    duration: count / INNER_FPS,
  });

  const demoDir = fresh(join(build, "demo"));
  const frames = await renderFrames(page, { from: 0, to: DURATION, fps: DEMO_FPS, dir: demoDir, capture: false });
  encodeDemo(demoDir);
  console.log(`inner.gif: ${count} frames, ${(statSync(innerGif).size / 1024).toFixed(0)} KB`);
  console.log(`demo.gif: ${frames} frames, ${(statSync(output).size / 1024).toFixed(0)} KB -> ${output}`);
} finally {
  await browser.close();
}
