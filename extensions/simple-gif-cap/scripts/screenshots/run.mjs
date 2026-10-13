// Regenerates the Raycast Store screenshots in metadata/ from the real extension.
// Run: npm run screenshots   (see "Store screenshots" in AGENTS.md first)
//
// 1. Renders a few short clips from the demo scene (scripts/demo) in headless
//    Chrome, so no real screen content ends up in the screenshots.
// 2. Drops them into the extension's recordings folder and opens the preview
//    deeplink for each, which runs the real conversion and fills the history.
// 3. Opens the views to capture, grabs the Raycast window with screencapture
//    and composes each onto a 2000x1250 canvas.
// 4. Removes the GIFs and videos it created.
//
// Your own captures are moved aside while it runs (the history hides entries
// whose files are missing) and put back afterwards, so they never show up.
//
// It drives Raycast with synthetic key presses, so leave the Mac alone while it runs.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const build = join(root, "scripts", "screenshots", "build");
const metadata = join(root, "metadata");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const support = join(homedir(), "Library", "Application Support", "com.raycast.macos", "extensions", manifest.name);
const recordings = join(support, "recordings");
const outputDir = process.env.GIFCAP_OUTPUT_DIR ?? join(homedir(), "Downloads");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ffmpeg = process.env.FFMPEG_PATH ?? "/opt/homebrew/bin/ffmpeg";

/** Clips cut from the demo scene, oldest first. The last one is what "Show Last GIF" shows. */
const CLIPS = [
  { name: "chart", from: 0, to: 3, clip: { x: 284, y: 300, width: 712, height: 210 } },
  { name: "button", from: 5.5, to: 8.2, clip: { x: 270, y: 470, width: 720, height: 90 } },
  { name: "window", from: 5.6, to: 8.0, clip: { x: 250, y: 150, width: 780, height: 520 } },
  { name: "deploy", from: 5.3, to: 8.8, clip: { x: 272, y: 200, width: 736, height: 436 } },
];

/** Screenshots, in Store order: the command to open and keys to press before capturing. */
const SHOTS = [
  { file: "simple-gif-cap-1.png", command: "preview" },
  { file: "simple-gif-cap-2.png", command: "recent-gifs" },
  { file: "simple-gif-cap-3.png", command: "preview", keys: [["t", "command"]] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();
const pad = (n) => String(n).padStart(2, "0");

function deeplink(command, context) {
  const base = `raycast://extensions/${manifest.author}/${manifest.name}/${command}`;

  return context ? `${base}?launchContext=${encodeURIComponent(JSON.stringify(context))}` : base;
}

function osa(script) {
  return run("osascript", ["-e", script]);
}

function press(key, modifier) {
  const using = modifier ? ` using ${modifier} down` : "";
  const code = { escape: 53, return: 36 }[key];
  osa(`tell application "System Events" to ${code ? `key code ${code}` : `keystroke "${key}"`}${using}`);
}

function closeRaycast() {
  press("escape");
  press("escape");
}

/** Id of the visible Raycast window, or 0. */
function raycastWindow() {
  const jxa = `ObjC.import("CoreGraphics");
    const list = ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0));
    let id = 0;
    for (let i = 0; i < list.count; i++) {
      const w = list.objectAtIndex(i);
      if (ObjC.unwrap(w.objectForKey("kCGWindowOwnerName")) === "Raycast" && ObjC.unwrap(w.objectForKey("kCGWindowLayer")) > 0) {
        id = ObjC.unwrap(w.objectForKey("kCGWindowNumber"));
      }
    }
    id;`;

  return Number(run("osascript", ["-l", "JavaScript", "-e", jxa]));
}

async function waitFor(check, { timeout = 15000, label }) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = check();
    if (value) {
      return value;
    }
    await sleep(250);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function renderClips() {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
    await page.goto(`file://${join(root, "scripts", "demo", "scene.html")}`);
    for (const clip of CLIPS) {
      const frames = join(build, "frames", clip.name);
      rmSync(frames, { recursive: true, force: true });
      mkdirSync(frames, { recursive: true });
      const count = Math.round((clip.to - clip.from) * 30);
      for (let i = 0; i < count; i++) {
        await page.evaluate((t) => window.render(t, { capture: true }), clip.from + i / 30);
        await page.screenshot({ path: join(frames, `${String(i + 1).padStart(4, "0")}.png`), clip: clip.clip });
      }
      execFileSync(ffmpeg, [
        "-v",
        "error",
        "-y",
        "-framerate",
        "30",
        "-i",
        join(frames, "%04d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        join(build, `${clip.name}.mov`),
      ]);
    }
  } finally {
    await browser.close();
  }
}

/** Feeds the clips through the real preview flow. Returns the files to clean up. */
async function createCaptures() {
  mkdirSync(recordings, { recursive: true });
  const created = [];
  const start = new Date();
  start.setSeconds(0, 0);
  for (const [index, clip] of CLIPS.entries()) {
    const at = new Date(start.getTime() + index * 61_000);
    const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} at ${pad(at.getHours())}.${pad(at.getMinutes())}.${pad(at.getSeconds())}`;
    const moviePath = join(recordings, `GIF ${stamp}.mov`);
    const gifPath = join(outputDir, `GIF ${stamp}.gif`);
    copyFileSync(join(build, `${clip.name}.mov`), moviePath);
    created.push(moviePath, gifPath);
    run("open", [deeplink("preview", { moviePath, createdAt: at.getTime() })]);
    await waitFor(() => existsSync(gifPath), { timeout: 30000, label: `${clip.name} to convert` });
    await sleep(1500);
  }
  closeRaycast();

  return created;
}

/** Moves existing captures out of sight. Returns a function that puts them back. */
function stashExistingCaptures() {
  const stash = join(build, "stash");
  mkdirSync(stash, { recursive: true });
  const moved = [];
  const sources = [
    [outputDir, (file) => file.startsWith("GIF ") && file.endsWith(".gif")],
    [recordings, (file) => file.endsWith(".mov")],
  ];
  for (const [dir, matches] of sources) {
    if (!existsSync(dir)) {
      continue;
    }
    for (const file of readdirSync(dir).filter(matches)) {
      const target = join(stash, `${moved.length}-${file}`);
      renameSync(join(dir, file), target);
      moved.push([target, join(dir, file)]);
    }
  }

  return () => moved.forEach(([from, to]) => renameSync(from, to));
}

/**
 * Window on a solid canvas. The Store check wants the same background on every
 * screenshot and about 12% padding, so no gradient (windows of different sizes
 * would show different parts of it) and a fixed window width.
 */
function compose(source, target) {
  const graph = [
    "[1:v]scale=1520:-1,format=rgba,split[w][s]",
    "[s]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.35,pad=iw+200:ih+200:100:100:color=black@0,boxblur=luma_radius=40:luma_power=2:alpha_radius=40:alpha_power=2[sh]",
    "[0:v][sh]overlay=(W-w)/2:(H-h)/2+16[bg]",
    "[bg][w]overlay=(W-w)/2:(H-h)/2,format=rgb24",
  ].join(";");
  execFileSync(ffmpeg, [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x6b2d6b:s=2000x1250",
    "-i",
    source,
    "-filter_complex",
    graph,
    "-frames:v",
    "1",
    target,
  ]);
}

async function captureShots() {
  mkdirSync(metadata, { recursive: true });
  for (const shot of SHOTS) {
    run("open", [deeplink(shot.command)]);
    await waitFor(raycastWindow, { label: `the ${shot.command} window` });
    // Let the view load and its images decode.
    await sleep(2500);
    for (const [key, modifier] of shot.keys ?? []) {
      press(key, modifier);
      await sleep(1500);
    }
    const raw = join(build, `raw-${shot.file}`);
    execFileSync("screencapture", ["-x", "-o", `-l${await waitFor(raycastWindow, { label: "the window" })}`, raw]);
    compose(raw, join(metadata, shot.file));
    closeRaycast();
    await sleep(800);
    console.log(`captured ${shot.file}`);
  }
}

mkdirSync(build, { recursive: true });

// --compose-only: rebuild metadata/ from the last run's raw window captures, without Raycast.
if (process.argv.includes("--compose-only")) {
  for (const shot of SHOTS) {
    compose(join(build, `raw-${shot.file}`), join(metadata, shot.file));
  }
  console.log(`Recomposed ${SHOTS.length} screenshots in ${metadata}.`);
  process.exit(0);
}

let created = [];
const restore = stashExistingCaptures();
try {
  console.log("Rendering clips...");
  await renderClips();
  console.log("Creating captures through the preview command...");
  created = await createCaptures();
  await captureShots();
} finally {
  closeRaycast();
  for (const file of created) {
    rmSync(file, { force: true });
  }
  rmSync(join(support, "previews"), { recursive: true, force: true });
  restore();
}
console.log(`Done. Screenshots are in ${metadata}. ${readdirSync(metadata).length} files.`);
