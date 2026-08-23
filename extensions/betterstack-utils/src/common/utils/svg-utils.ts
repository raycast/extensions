import { promisify } from "node:util";
import { execFile } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { isRaycastV2Beta } from "@/common/utils/version-utils";

export function toSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Rasterizes to a PNG data URI on macOS instead of embedding raw SVG, working around SVG
 * rendering issues in Raycast v1 (colored fills rendering as black). Raycast v2 beta's SVG
 * renderer doesn't have that bug and also supports the SMIL pulse animation that a static
 * PNG can't carry, so it keeps getting raw SVG. Also falls back to SVG on non-macOS, where
 * the `sips` library is not available.
 */
export async function toImageDataUri(svg: string, supportPath: string, raycastVersion: string): Promise<string> {
  if (process.platform !== "darwin" || isRaycastV2Beta(raycastVersion)) return toSvgDataUri(svg);

  const svgPath = path.join(supportPath, `render-${randomUUID()}.svg`);
  const pngPath = path.join(supportPath, `render-${randomUUID()}.png`);

  try {
    await fs.writeFile(svgPath, svg);
    await svgToPng(svgPath, pngPath);
    const png = await fs.readFile(pngPath);
    return `data:image/png;base64,${png.toString("base64")}`;
  } finally {
    void fs.unlink(svgPath).catch(() => {});
    void fs.unlink(pngPath).catch(() => {});
  }
}

export async function exportSvgToClipboard(svg: string, supportPath: string): Promise<void> {
  const svgPath = path.join(supportPath, "schedule.svg");
  const pngPath = path.join(supportPath, "schedule.png");
  await fs.writeFile(svgPath, svg);
  await svgToPng(svgPath, pngPath);
  await copyImageToClipboard(pngPath);
  void fs.unlink(svgPath).catch(() => {});
  void fs.unlink(pngPath).catch(() => {});
}

export async function svgToPng(svgPath: string, pngPath: string): Promise<void> {
  await execFileAsync("sips", ["-s", "format", "png", svgPath, "--out", pngPath]);
}

async function copyImageToClipboard(pngPath: string): Promise<void> {
  const script = `set the clipboard to (read (POSIX file "${pngPath}") as «class PNGf»)`;
  await execFileAsync("osascript", ["-e", script]);
}

const execFileAsync = promisify(execFile);
