import { Clipboard, Toast, closeMainWindow, environment, showHUD, showToast } from "@raycast/api";
import { execFile } from "child_process";
import { constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { theme } from "./svg";

const execFileAsync = promisify(execFile);

/** Device pixels per SVG unit in the exported PNG (2× for Retina displays). */
const SCALE = 2;
const PADDING = 16;
const RADIUS = 18;

/**
 * Rasterizing needs macOS's built-in QuickLook renderer; Raycast extensions can't
 * ship native rasterizer modules. The image actions are hidden on other platforms.
 */
export const canShareMeterImage = process.platform === "darwin";

export type ShareMode = "copy" | "paste" | "save";

type Canvas = { svg: string; width: number; height: number };

/**
 * Wraps the meter in an opaque, padded card. The wrapper is square because QuickLook
 * always thumbnails into a square canvas and `sips -c` crops from the center, so a
 * vertically centered card is the only layout both tools agree on.
 */
function toExportCanvas(markup: string): Canvas {
  const m = markup.match(/^<svg[^>]*\bwidth="([\d.]+)"\s+height="([\d.]+)"[^>]*>([\s\S]*)<\/svg>\s*$/);
  if (!m) throw new Error("Unexpected meter markup");
  const width = Number(m[1]) + PADDING * 2;
  const height = Number(m[2]) + PADDING * 2;
  const top = (width - height) / 2;
  const background = theme.isDark ? "#1c1c1e" : "#ffffff";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}">` +
    `<rect x="0" y="${top}" width="${width}" height="${height}" rx="${RADIUS}" fill="${background}"/>` +
    `<g transform="translate(${PADDING},${top + PADDING})">${m[3]}</g></svg>`;
  return { svg, width, height };
}

/** Rasterizes the meter to a retina PNG in a fresh temp directory. The caller removes the directory. */
async function rasterize(markup: string): Promise<{ png: string; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "speedtest-meter-"));
  try {
    const canvas = toExportCanvas(markup);
    const svgPath = join(dir, "meter.svg");
    writeFileSync(svgPath, canvas.svg);
    const size = Math.round(canvas.width * SCALE);
    // QuickLook occasionally hangs on complex SVGs; don't leave the action stuck.
    await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", String(size), "-o", dir, svgPath], { timeout: 20_000 });
    const thumbnail = `${svgPath}.png`;
    if (!existsSync(thumbnail)) throw new Error("QuickLook could not render the meter");
    const png = join(dir, "speedtest-meter.png");
    const cropHeight = String(Math.round(canvas.height * SCALE));
    await execFileAsync("/usr/bin/sips", ["-c", cropHeight, String(size), thumbnail, "--out", png], {
      timeout: 20_000,
    });
    if (!existsSync(png)) throw new Error("Could not crop the rendered meter");
    return { png, dir };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Copies into ~/Downloads without overwriting; appends -2, -3, … on collisions. */
function saveToDownloads(path: string, fileName: string): string {
  const downloads = join(homedir(), "Downloads");
  mkdirSync(downloads, { recursive: true });
  const dot = fileName.lastIndexOf(".");
  const stem = fileName.slice(0, dot);
  const ext = fileName.slice(dot);
  for (let n = 1; n < 100; n++) {
    const target = join(downloads, n === 1 ? fileName : `${stem}-${n}${ext}`);
    try {
      copyFileSync(path, target, constants.COPYFILE_EXCL);
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Too many files with this name in Downloads");
}

/** Renders the meter and copies it, pastes it into the frontmost app, or saves it to ~/Downloads. */
export async function shareMeterImage(markup: string, mode: ShareMode): Promise<void> {
  const { png, dir } = await rasterize(markup);
  try {
    if (mode === "save") {
      const target = saveToDownloads(png, `speedtest-${stamp()}.png`);
      await showToast({ style: Toast.Style.Success, title: "Saved to Downloads", message: target.split("/").pop() });
      return;
    }
    // The temp dir is removed below; the clipboard keeps a file reference, so it
    // needs a path that survives the call.
    const stable = join(environment.supportPath, "speedtest-meter.png");
    copyFileSync(png, stable);
    if (mode === "paste") {
      await closeMainWindow();
      await Clipboard.paste({ file: stable });
      await showHUD("Pasted meter image");
      return;
    }
    await Clipboard.copy({ file: stable });
    await showToast({
      style: Toast.Style.Success,
      title: "Meter image copied",
      message: "Paste it in Slack, Notes, anywhere",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
