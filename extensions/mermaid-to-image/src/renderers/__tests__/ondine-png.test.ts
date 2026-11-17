import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as browser from "../../utils/browser-manager";
import * as raster from "../../utils/browser-svg-raster";
import { renderWithOndine } from "../ondine";
import { getSupersampledSize, parseSvgPixelDimensions } from "../../utils/svg-preview";
import { loadPreviewAsset } from "../../utils/preview-assets";
import { copyDiagramImage } from "../../utils/preview-actions";

let directory: string;
const temporaryDirectories: string[] = [];

// A header fixture, deliberately not evidence of successful full PNG decoding.
function pngHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").copy(header);
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "ondine-png-test-"));
  vi.spyOn(browser, "resolveCompatibleBrowser").mockResolvedValue({ source: "environment", executablePath: "/chrome" });
  vi.spyOn(raster, "renderSvgToRasterWithBrowser").mockImplementation(async (options) => {
    temporaryDirectories.push(options.tmpDir!);
    const dimensions = getSupersampledSize(parseSvgPixelDimensions(options.svgContent)!, 3, 4096);
    const output = path.join(options.tmpDir!, "raster.png");
    await fs.writeFile(output, pngHeader(dimensions.width, dimensions.height));
    await fs.writeFile(path.join(options.tmpDir!, "diagram.svg"), options.svgContent);
    return { path: output, tempPaths: [output] };
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(directory, { force: true, recursive: true });
  await Promise.all(temporaryDirectories.splice(0).map((dir) => fs.rm(dir, { force: true, recursive: true })));
});

function request() {
  return {
    code: "mindmap\n root((開發計畫))\n  技術驗證\n  測試與發布",
    format: "png" as const,
    requestedEngine: "auto" as const,
    useOndineInAuto: true,
    outputPath: path.join(directory, "diagram.png"),
  };
}

describe("Ondine Auto PNG", () => {
  it.each(["github-light", "github-dark"])("writes themed %s PNG and reuses it for preview/copy", async (themeName) => {
    const current = request();
    const result = await renderWithOndine(current, { themeName, timeoutMs: 1234 });
    expect(result).toMatchObject({
      engine: "ondine",
      format: "png",
      outputPath: current.outputPath,
      rendererMetadata: { version: "0.0.3", theme: themeName },
    });
    expect(result.svgRasterStrategy).toBeUndefined();
    expect(raster.renderSvgToRasterWithBrowser).toHaveBeenCalledTimes(1);
    const options = vi.mocked(raster.renderSvgToRasterWithBrowser).mock.calls[0][0];
    expect(options).toMatchObject({ browserExecutablePath: "/chrome", factor: 3, maxEdge: 4096, timeoutMs: 1234 });
    expect(options.svgContent).toContain("開發計畫");
    expect(options.svgContent).not.toContain("var(");
    expect(options.svgContent).toContain(themeName === "github-dark" ? "background:#0d1117" : "background:#ffffff");
    await expect(fs.access(options.tmpDir!)).rejects.toThrow();
    expect(await fs.readdir(directory)).toEqual(["diagram.png"]);
    const reraster = vi.fn();
    const preview = await loadPreviewAsset({
      format: result.format,
      imagePath: result.outputPath,
      baseName: "preview",
      renderSvgPreview: reraster,
    });
    const copy = vi.fn();
    await copyDiagramImage({
      format: result.format,
      imagePath: result.outputPath,
      previewRasterPath: preview.previewRasterPath,
      copyRasterImage: copy,
      resolveSvgCopy: reraster,
    });
    expect(preview.previewRasterPath).toBe(result.outputPath);
    expect(preview.tempPaths).toEqual([]);
    expect(copy).toHaveBeenCalledExactlyOnceWith(result.outputPath);
    expect(reraster).not.toHaveBeenCalled();
  });

  it("requires Auto opt-in and preserves explicit PNG rejection", async () => {
    for (const current of [
      { ...request(), useOndineInAuto: false },
      { ...request(), useOndineInAuto: undefined },
      { ...request(), requestedEngine: "ondine" as const },
    ]) {
      await expect(renderWithOndine(current)).rejects.toThrow();
    }
    expect(raster.renderSvgToRasterWithBrowser).not.toHaveBeenCalled();
  });

  it("surfaces missing browser without invoking raster or writing output", async () => {
    vi.mocked(browser.resolveCompatibleBrowser).mockResolvedValue({ source: "missing" });
    await expect(renderWithOndine(request())).rejects.toThrow("browser");
    expect(raster.renderSvgToRasterWithBrowser).not.toHaveBeenCalled();
    expect(await fs.readdir(directory)).toEqual([]);
  });

  it("cleans partial browser artifacts and preserves failure identity", async () => {
    const failure = new Error("browser timed out");
    vi.mocked(raster.renderSvgToRasterWithBrowser).mockImplementation(async (options) => {
      temporaryDirectories.push(options.tmpDir!);
      await fs.writeFile(path.join(options.tmpDir!, "partial.svg"), options.svgContent);
      throw failure;
    });
    await expect(renderWithOndine(request())).rejects.toBe(failure);
    await expect(fs.access(temporaryDirectories[0])).rejects.toThrow();
    expect(await fs.readdir(directory)).toEqual([]);
  });

  it.each(["non-PNG", "truncated", "zero", "oversized", "wrong-size"])(
    "rejects %s output and cleans temporary files",
    async (kind) => {
      vi.mocked(raster.renderSvgToRasterWithBrowser).mockImplementation(async (options) => {
        temporaryDirectories.push(options.tmpDir!);
        const output = path.join(options.tmpDir!, "bad.png");
        const data =
          kind === "non-PNG"
            ? Buffer.from("not png")
            : kind === "truncated"
              ? pngHeader(1, 1).subarray(0, 24)
              : pngHeader(kind === "zero" ? 0 : kind === "oversized" ? 5000 : 1, 1);
        await fs.writeFile(output, data);
        return { path: output, tempPaths: [output] };
      });
      await expect(renderWithOndine(request())).rejects.toThrow("PNG");
      await expect(fs.access(temporaryDirectories[0])).rejects.toThrow();
      expect(await fs.readdir(directory)).toEqual([]);
    },
  );

  it("removes partial destination on output-copy failure without replacing the error", async () => {
    const failure = new Error("disk full");
    vi.spyOn(fs, "copyFile").mockImplementation(async (_source, destination) => {
      await fs.writeFile(destination, "partial");
      throw failure;
    });
    await expect(renderWithOndine(request())).rejects.toBe(failure);
    expect(await fs.readdir(directory)).toEqual([]);
    await expect(fs.access(temporaryDirectories[0])).rejects.toThrow();
  });
});
