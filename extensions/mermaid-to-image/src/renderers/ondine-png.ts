import fs from "fs/promises";
import os from "os";
import path from "path";
import { resolveCompatibleBrowser } from "../utils/browser-manager";
import { BrowserBootstrapRequiredError } from "../utils/browser-errors";
import { renderSvgToRasterWithBrowser } from "../utils/browser-svg-raster";
import { getSupersampledSize, parseSvgPixelDimensions, type SvgPixelDimensions } from "../utils/svg-preview";

const FACTOR = 3;
const MAX_EDGE = 4096;

async function validatePngHeader(filePath: string, expected: SvgPixelDimensions): Promise<void> {
  const file = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(33);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    if (
      bytesRead !== header.length ||
      header.subarray(0, 16).toString("hex") !== "89504e470d0a1a0a0000000d49484452" ||
      header.readUInt32BE(16) !== expected.width ||
      header.readUInt32BE(20) !== expected.height
    ) {
      throw new Error("Ondine browser output has an invalid PNG header or unexpected dimensions.");
    }
  } finally {
    await file.close();
  }
}

export async function writeOndinePng(svg: string, outputPath: string, timeoutMs = 10_000): Promise<void> {
  const dimensions = parseSvgPixelDimensions(svg);
  if (!dimensions) throw new Error("Ondine PNG requires SVG pixel dimensions.");
  const browser = await resolveCompatibleBrowser();
  if (!browser.executablePath) {
    throw new BrowserBootstrapRequiredError("Ondine PNG output needs a browser-backed rasterizer.");
  }
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mermaid-ondine-png-"));
  try {
    const raster = await renderSvgToRasterWithBrowser({
      svgContent: svg,
      baseName: "diagram",
      browserExecutablePath: browser.executablePath,
      tmpDir: directory,
      factor: FACTOR,
      maxEdge: MAX_EDGE,
      timeoutMs,
    });
    await validatePngHeader(raster.path, getSupersampledSize(dimensions, FACTOR, MAX_EDGE));
    try {
      await fs.copyFile(raster.path, outputPath);
    } catch (error) {
      await fs.rm(outputPath, { force: true }).catch(() => undefined);
      throw error;
    }
  } finally {
    // Cleanup must not replace the render failure or invalidate a completed output.
    await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
