import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSvgToRasterPreview, resolveSvgCopyRaster } from "../svg-raster";

const SVG = '<svg width="300" height="200" viewBox="0 0 300 200"></svg>';
const TALL_SVG = '<svg width="300" height="900" viewBox="0 0 300 900"></svg>';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-raster-test-"));
  tempDirs.push(dir);
  return dir;
}

function writePngWithDimensions(filePath: string, width: number, height: number): void {
  const buffer = Buffer.alloc(24, 0);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  fs.writeFileSync(filePath, buffer);
}

describe("renderSvgToRasterPreview", () => {
  it("prefers quick look output when available", async () => {
    const tmpDir = createTempDir();
    const quickLookOutput = path.join(tmpDir, "quick-look.png");
    const renderWithQuickLook = vi.fn(async () => {
      writePngWithDimensions(quickLookOutput, 900, 600);
      return quickLookOutput;
    });
    const renderWithSips = vi.fn();

    const result = await renderSvgToRasterPreview({
      materializedSvgContent: SVG,
      baseName: "diagram",
      tmpDir,
      renderWithQuickLook,
      renderWithSips,
    });

    expect(result.path).toBe(quickLookOutput);
    expect(renderWithQuickLook).toHaveBeenCalledTimes(1);
    expect(renderWithSips).not.toHaveBeenCalled();
  });

  it("falls back to sips when quick look fails", async () => {
    const tmpDir = createTempDir();
    const renderWithQuickLook = vi.fn().mockRejectedValue(new Error("quick look failed"));
    const renderWithSips = vi.fn(async (_inputSvgPath: string, outputPngPath: string) => {
      writePngWithDimensions(outputPngPath, 900, 600);
      return outputPngPath;
    });

    const result = await renderSvgToRasterPreview({
      materializedSvgContent: SVG,
      baseName: "diagram",
      tmpDir,
      renderWithQuickLook,
      renderWithSips,
    });

    expect(renderWithQuickLook).toHaveBeenCalledTimes(1);
    expect(renderWithSips).toHaveBeenCalledTimes(1);
    expect(result.path.endsWith("-3x-sips.png")).toBe(true);
  });

  it("prefers sips first for extreme aspect ratios", async () => {
    const tmpDir = createTempDir();
    const renderWithQuickLook = vi.fn();
    const renderWithSips = vi.fn(async (_inputSvgPath: string, outputPngPath: string) => {
      writePngWithDimensions(outputPngPath, 900, 2700);
      return outputPngPath;
    });

    const result = await renderSvgToRasterPreview({
      materializedSvgContent: TALL_SVG,
      baseName: "tall-diagram",
      tmpDir,
      renderWithQuickLook,
      renderWithSips,
    });

    expect(renderWithSips).toHaveBeenCalledTimes(1);
    expect(renderWithQuickLook).not.toHaveBeenCalled();
    expect(result.path.endsWith("-3x-sips.png")).toBe(true);
  });

  it("rejects quick look output when its aspect ratio drifts too far from the svg", async () => {
    const tmpDir = createTempDir();
    const quickLookOutput = path.join(tmpDir, "quick-look-bad.png");
    const renderWithQuickLook = vi.fn(async () => {
      writePngWithDimensions(quickLookOutput, 900, 900);
      return quickLookOutput;
    });
    const renderWithSips = vi.fn(async (_inputSvgPath: string, outputPngPath: string) => {
      writePngWithDimensions(outputPngPath, 900, 600);
      return outputPngPath;
    });

    const result = await renderSvgToRasterPreview({
      materializedSvgContent: SVG,
      baseName: "diagram",
      tmpDir,
      renderWithQuickLook,
      renderWithSips,
    });

    expect(renderWithQuickLook).toHaveBeenCalledTimes(1);
    expect(renderWithSips).toHaveBeenCalledTimes(1);
    expect(result.path.endsWith("-3x-sips.png")).toBe(true);
  });
});

describe("resolveSvgCopyRaster", () => {
  it("reuses the existing preview raster when present", async () => {
    const tmpDir = createTempDir();
    const previewPath = path.join(tmpDir, "preview.png");
    fs.writeFileSync(previewPath, "png");
    const renderRaster = vi.fn();

    const result = await resolveSvgCopyRaster({
      previewRasterPath: previewPath,
      renderRaster,
    });

    expect(result).toEqual({ path: previewPath, tempPaths: [] });
    expect(renderRaster).not.toHaveBeenCalled();
  });

  it("renders a fresh raster when preview output is unavailable", async () => {
    const renderResult = {
      path: "/tmp/generated.png",
      tempPaths: ["/tmp/generated.png"],
    };
    const renderRaster = vi.fn().mockResolvedValue(renderResult);

    const result = await resolveSvgCopyRaster({
      previewRasterPath: "/tmp/missing.png",
      renderRaster,
    });

    expect(result).toBe(renderResult);
    expect(renderRaster).toHaveBeenCalledTimes(1);
  });
});
