import {
  Clipboard,
  Toast,
  closeMainWindow,
  environment,
  showHUD,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Output scale relative to the SVG's viewBox: 2x for retina displays. */
export const SHARE_SCALE = 2;

export type ShareMode = "copy" | "paste" | "save";

/** Image sharing rasterizes through macOS QuickLook; there is no equivalent on Windows. */
export const canShareImage = process.platform === "darwin";

/** Card size in SVG units, read from the root `viewBox`. */
function svgSize(svg: string): { width: number; height: number } {
  const m =
    /^\s*<svg\b[^>]*\bviewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(
      svg,
    );
  if (!m) throw new Error("SVG has no viewBox");
  return { width: Number(m[1]), height: Number(m[2]) };
}

/**
 * Center a `width`×`height` SVG in a transparent square canvas. QuickLook
 * thumbnails are always square: a non-square SVG gets scaled up to fill the
 * square and cropped, while a square one renders 1:1. The extra transparent
 * area is cut off again after rasterizing.
 */
function squareCanvas(svg: string, width: number, height: number): string {
  const side = Math.max(width, height);
  const x = (side - width) / 2;
  const y = (side - height) / 2;
  // Nested <svg> elements are positioned by x/y/width/height in the parent's
  // units; drop the card's own display size so the attributes aren't duplicated.
  const inner = svg.replace(/^\s*<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\s(?:x|y|width|height)="[^"]*"/g, "")
      .replace(
        /^<svg\b/,
        `<svg x="${x}" y="${y}" width="${width}" height="${height}"`,
      ),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${side * SHARE_SCALE}" height="${side * SHARE_SCALE}" viewBox="0 0 ${side} ${side}">${inner}</svg>`;
}

/**
 * Rasterize the SVG to a retina PNG in a fresh temp directory. Uses macOS's
 * built-in QuickLook renderer — Raycast extensions can't ship native
 * rasterizer modules. The caller removes the directory when done.
 */
async function rasterize(svg: string): Promise<{ png: string; dir: string }> {
  const { width, height } = svgSize(svg);
  const dir = mkdtempSync(join(tmpdir(), "graphcalc-share-"));
  const svgPath = join(dir, "graph.svg");
  const png = `${svgPath}.png`;
  const side = Math.max(width, height) * SHARE_SCALE;
  try {
    writeFileSync(svgPath, squareCanvas(svg, width, height));
    // QuickLook occasionally hangs; don't leave the action stuck.
    await execFileAsync(
      "/usr/bin/qlmanage",
      ["-t", "-s", String(side), "-o", dir, svgPath],
      { timeout: 20_000 },
    );
    if (!existsSync(png)) {
      throw new Error("QuickLook could not render the image");
    }
    // Crop the transparent padding back off (sips crops from the center).
    await execFileAsync(
      "/usr/bin/sips",
      [
        "--cropToHeightWidth",
        String(height * SHARE_SCALE),
        String(width * SHARE_SCALE),
        png,
      ],
      { timeout: 20_000 },
    );
    return { png, dir };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Filename-safe form of an expression: `sin(x)/x` → `sin-x-x`. Strips
 * anything outside `[\w.-]`, leading/trailing separators, and caps the length.
 */
export function safeFileName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 60)
    .replace(/[.-]+$/, "");
  return base || "graph";
}

/** Copy into ~/Downloads without overwriting; appends -2, -3, … on collisions. */
function saveToDownloads(path: string, fileName: string): string {
  const downloads = join(homedir(), "Downloads");
  mkdirSync(downloads, { recursive: true });
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";
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

/**
 * Copy the file, paste it into the frontmost app, or save it to ~/Downloads.
 * Clipboard modes reference the file by path, so `path` must outlive the call.
 */
async function shareFile(
  path: string,
  mode: ShareMode,
  saveName: string,
  what: string,
): Promise<void> {
  if (mode === "paste") {
    await closeMainWindow();
    await Clipboard.paste({ file: path });
    await showHUD(`Pasted ${what}`);
    return;
  }
  if (mode === "save") {
    const target = saveToDownloads(path, saveName);
    await showToast({
      style: Toast.Style.Success,
      title: "Saved to Downloads",
      message: target.split("/").pop(),
    });
    return;
  }
  await Clipboard.copy({ file: path });
  await showToast({
    style: Toast.Style.Success,
    title: `${what[0].toUpperCase()}${what.slice(1)} copied`,
    message: "Paste it in Slack, iMessage, anywhere",
  });
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** `graphcalc-<expression>-<yyyymmdd-hhmm>.png` */
export function shareFileName(expression: string): string {
  return `graphcalc-${safeFileName(expression)}-${stamp()}.png`;
}

/**
 * Rasterize the graph card at `SHARE_SCALE` and copy/paste/save it.
 * macOS only (QuickLook).
 */
export async function shareGraphImage(
  svg: string,
  mode: ShareMode,
  expression: string,
): Promise<void> {
  const { png, dir } = await rasterize(svg);
  try {
    let path = png;
    if (mode !== "save") {
      // The temp dir is removed below; the clipboard needs a path that survives.
      mkdirSync(environment.supportPath, { recursive: true });
      path = join(environment.supportPath, "graph-share.png");
      copyFileSync(png, path);
    }
    await shareFile(path, mode, shareFileName(expression), "graph image");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
