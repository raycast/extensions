/**
 * PNG previews of codes, drawn with macOS's `sips` and kept in the
 * extension's support folder. Raycast's Markdown sizes an image from its URL
 * (`?raycast-width=…&raycast-height=…`), and a file URL carries those hints
 * plainly, so the previews in Detail views are files rather than data URIs.
 */

import { execFile, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import { version as QRDX_VERSION } from "qrdx/package.json";
import {
  artworkSize,
  buildSVGString,
  getSVGDataURI,
  type QRRenderProps,
  squareSVG,
} from "./qr-engine";

const execFileAsync = promisify(execFile);

/**
 * A cache folder in the support folder, one per qrdx version, preview size
 * and `drawing` (a name for how the previews are drawn), so an update, a new
 * size or a new drawing redraws every preview. Whatever else `name` holds
 * (the folders of earlier versions, sizes and drawings, older files) is
 * removed when the folder is made.
 */
export function cacheDir(
  name: string,
  pixels: number,
  drawing?: string
): string {
  const root = join(environment.supportPath, name);
  const folder = `${QRDX_VERSION}-${pixels}px${drawing ? `-${drawing}` : ""}`;
  const dir = join(root, folder);
  if (!existsSync(dir)) {
    if (existsSync(root)) {
      for (const old of readdirSync(root)) {
        if (old !== folder) {
          rmSync(join(root, old), { recursive: true, force: true });
        }
      }
    }
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** A code with any frame, centered on a transparent square `pixels` wide. */
export function codeSVG(props: QRRenderProps, pixels: number): string {
  return squareSVG(buildSVGString(props), artworkSize(props), pixels);
}

/** The sips call that draws `svgPath` as a `pixels`-wide square PNG. */
function sipsArgs(svgPath: string, pngPath: string, pixels: number): string[] {
  return [
    "-s",
    "format",
    "png",
    svgPath,
    "--out",
    pngPath,
    "--resampleHeightWidth",
    String(pixels),
    String(pixels),
  ];
}

/**
 * Temporary files next to `pngPath`. Their names start with a dot, so they
 * never look like a preview. The PNG is drawn under a temporary name and
 * then renamed, so Raycast never reads a half-written preview.
 */
function tempPaths(pngPath: string): { svg: string; png: string } {
  const base = join(dirname(pngPath), `.${randomUUID()}`);
  return { svg: `${base}.svg`, png: `${base}.png` };
}

/** Draws `svg` (a square `pixels` wide) as a PNG at `pngPath`. */
export function drawPNGSync(svg: string, pngPath: string, pixels: number) {
  const temp = tempPaths(pngPath);
  writeFileSync(temp.svg, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`);
  try {
    execFileSync("sips", sipsArgs(temp.svg, temp.png, pixels), {
      stdio: "pipe",
    });
    renameSync(temp.png, pngPath);
  } finally {
    rmSync(temp.svg, { force: true });
    rmSync(temp.png, { force: true });
  }
}

/** {@link drawPNGSync} without blocking the extension while sips runs. */
export async function drawPNG(svg: string, pngPath: string, pixels: number) {
  const temp = tempPaths(pngPath);
  writeFileSync(temp.svg, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`);
  try {
    await execFileAsync("sips", sipsArgs(temp.svg, temp.png, pixels));
    renameSync(temp.png, pngPath);
  } finally {
    rmSync(temp.svg, { force: true });
    rmSync(temp.png, { force: true });
  }
}

/** A square image file in Markdown, shown `points` wide. */
export function imageMarkdown(path: string, points: number): string {
  return `![QR code](${pathToFileURL(path).href}?raycast-width=${points}&raycast-height=${points})`;
}

// ─── The preview after Generate ───────────────────────────────────────────────

// Raycast's window is 750 × 475 pt, and a Detail's Markdown starts about
// 76 pt from the top, which leaves about 330 pt above the action bar. The
// code is shown 300 pt square, drawn at twice that for Retina screens.
const PREVIEW_POINTS = 300;
const PREVIEW_PIXELS = PREVIEW_POINTS * 2;

/**
 * Markdown for a code's preview in a Detail, small enough to show whole.
 * The file's name is a hash of the drawing, because Raycast caches images
 * by path; drawing a new one removes the previous ones.
 */
export function previewMarkdown(props: QRRenderProps): string {
  const svg = codeSVG(props, PREVIEW_PIXELS);
  const dir = join(environment.supportPath, "preview");
  const hash = createHash("sha256").update(svg).digest("hex").slice(0, 16);
  const path = join(dir, `${hash}.png`);
  try {
    if (!existsSync(path)) {
      mkdirSync(dir, { recursive: true });
      for (const old of readdirSync(dir)) {
        rmSync(join(dir, old), { recursive: true, force: true });
      }
      drawPNGSync(svg, path, PREVIEW_PIXELS);
    }
    return imageMarkdown(path, PREVIEW_POINTS);
  } catch {
    // Without a PNG, the SVG itself, at its own size.
    return `![QR code](${getSVGDataURI(props)})`;
  }
}
