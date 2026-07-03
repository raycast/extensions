import { promisify } from "node:util";
import { execFile } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";

export function toSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
