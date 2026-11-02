import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPreviewAsset, resolveSvgCopyAsset } from "../preview-assets";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

function fixture(engine: "ondine" | "mmdc" = "ondine") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "preview-assets-test-"));
  directories.push(dir);
  const imagePath = path.join(dir, "diagram.svg");
  fs.writeFileSync(imagePath, `<svg class="${engine}" width="100" height="50"><text>中文</text></svg>`);
  return { imagePath, baseName: "diagram", format: "svg" };
}

describe("preview assets", () => {
  it.each(["ondine", "mmdc"] as const)(
    "does not fall back to native SVG when %s requires raster fidelity",
    async (engine) => {
      const failure = new Error("browser failed");
      await expect(
        loadPreviewAsset({
          ...fixture(engine),
          requireRaster: true,
          renderSvgPreview: vi.fn().mockRejectedValue(failure),
        }),
      ).rejects.toBe(failure);
    },
  );
  it("preserves the existing SVG fallback for other renderers", async () => {
    const result = await loadPreviewAsset({
      ...fixture(),
      renderSvgPreview: vi.fn().mockRejectedValue(new Error("failed")),
    });
    expect(result.imageContent).toMatch(/^data:image\/svg\+xml/);
    expect(result.previewRasterPath).toBeNull();
  });
  it.each(["ondine", "mmdc"] as const)("reuses the %s browser preview PNG for image copy", async (engine) => {
    const input = fixture(engine);
    const pngPath = path.join(path.dirname(input.imagePath), "preview.png");
    fs.writeFileSync(pngPath, "png fixture");
    const renderSvgPreview = vi.fn().mockResolvedValue({ path: pngPath, tempPaths: [pngPath] });
    const preview = await loadPreviewAsset({ ...input, requireRaster: true, renderSvgPreview });
    const copy = await resolveSvgCopyAsset({
      svgPath: input.imagePath,
      previewRasterPath: preview.previewRasterPath,
      baseName: "copy",
      renderSvgPreview,
    });
    expect(preview.imageContent).toMatch(/^data:image\/png/);
    expect(copy.path).toBe(pngPath);
    expect(renderSvgPreview).toHaveBeenCalledTimes(1);
  });
});
