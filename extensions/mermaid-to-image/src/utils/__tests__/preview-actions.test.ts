import { describe, expect, it, vi } from "vitest";
import { copyAsciiCode, copyDiagramImage } from "../preview-actions";

describe("copyDiagramImage", () => {
  it("copies raster images directly for png output", async () => {
    const copyRasterImage = vi.fn().mockResolvedValue(undefined);
    const resolveSvgCopy = vi.fn();

    await copyDiagramImage({
      format: "png",
      imagePath: "/tmp/diagram.png",
      previewRasterPath: null,
      copyRasterImage,
      resolveSvgCopy,
    });

    expect(copyRasterImage).toHaveBeenCalledWith("/tmp/diagram.png");
    expect(resolveSvgCopy).not.toHaveBeenCalled();
  });

  it("uses the svg copy resolver for svg output", async () => {
    const copyRasterImage = vi.fn().mockResolvedValue(undefined);
    const cleanupTempPath = vi.fn();
    const resolveSvgCopy = vi.fn().mockResolvedValue({
      path: "/tmp/diagram-preview.png",
      tempPaths: ["/tmp/temp-preview.png"],
    });

    await copyDiagramImage({
      format: "svg",
      imagePath: "/tmp/diagram.svg",
      previewRasterPath: "/tmp/existing-preview.png",
      copyRasterImage,
      resolveSvgCopy,
      cleanupTempPath,
    });

    expect(resolveSvgCopy).toHaveBeenCalledWith({
      svgPath: "/tmp/diagram.svg",
      previewRasterPath: "/tmp/existing-preview.png",
    });
    expect(copyRasterImage).toHaveBeenCalledWith("/tmp/diagram-preview.png");
    expect(cleanupTempPath).toHaveBeenCalledWith("/tmp/temp-preview.png");
  });
});

describe("copyAsciiCode", () => {
  it("copies the ASCII payload as text", async () => {
    const copyText = vi.fn().mockResolvedValue(undefined);

    await copyAsciiCode({
      asciiContent: "+---+",
      copyText,
    });

    expect(copyText).toHaveBeenCalledWith("+---+");
  });
});
