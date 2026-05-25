import { Clipboard, environment, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { rename, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";
import { DOWNLOADS_PATH, PNG_EXPORT_SUPPORTED } from "./constants";

const execFileAsync = promisify(execFile);
let sipsVerified = false;

function toCleanupErrorMessage(path: string): string {
  return `Failed to clean up temporary file: ${path}`;
}

async function cleanupFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw new Error(toCleanupErrorMessage(path));
  }
}

async function ensureSipsAvailable(): Promise<void> {
  if (sipsVerified) {
    return;
  }

  try {
    await execFileAsync("sips", ["--help"]);
    sipsVerified = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("sips not found. PNG export requires macOS built-in image tools.");
    }

    throw new Error("Failed to access macOS image conversion tools for PNG export.");
  }
}

function resizeSvgForRasterization(svg: string, size: number): string {
  const withWidth = /<svg\b[^>]*\bwidth="[^"]*"/i.test(svg)
    ? svg.replace(/\bwidth="[^"]*"/i, `width="${size}"`)
    : svg.replace(/<svg\b/i, `<svg width="${size}"`);

  return /<svg\b[^>]*\bheight="[^"]*"/i.test(withWidth)
    ? withWidth.replace(/\bheight="[^"]*"/i, `height="${size}"`)
    : withWidth.replace(/<svg\b/i, `<svg height="${size}"`);
}

export async function svgToPng(svg: string, outputPath: string, size: number = 256): Promise<void> {
  if (!PNG_EXPORT_SUPPORTED) {
    throw new Error("PNG export is only available on macOS");
  }

  const tempSvgPath = join(environment.supportPath, `${randomUUID()}.svg`);
  const tempPngPath = join(environment.supportPath, `${randomUUID()}.png`);
  const resizedSvg = resizeSvgForRasterization(svg, size);

  await writeFile(tempSvgPath, resizedSvg, "utf-8");

  try {
    await ensureSipsAvailable();
    await execFileAsync("sips", ["-s", "format", "png", tempSvgPath, "--out", tempPngPath]);
    await rename(tempPngPath, outputPath);
  } finally {
    await cleanupFile(tempSvgPath);
    await cleanupFile(tempPngPath);
  }
}

export async function downloadSvg(svg: string, name: string): Promise<void> {
  const filePath = join(DOWNLOADS_PATH, `${name}.svg`);
  await writeFile(filePath, svg, "utf-8");
  await showHUD(`Saved to Downloads/${name}.svg`);
}

export async function downloadPng(svg: string, name: string, size: number = 256): Promise<void> {
  const filePath = join(DOWNLOADS_PATH, `${name}.png`);
  await svgToPng(svg, filePath, size);
  await showHUD(`Saved to Downloads/${name}.png`);
}

export async function copyPng(svg: string, size: number = 256): Promise<void> {
  const tempPngPath = join(environment.supportPath, `${randomUUID()}.png`);

  try {
    await svgToPng(svg, tempPngPath, size);
    await Clipboard.copy({ file: tempPngPath });
    await showHUD("PNG copied to clipboard");
  } finally {
    await cleanupFile(tempPngPath);
  }
}
