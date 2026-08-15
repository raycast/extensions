import fs from "fs";
import { SvgRasterizationResult, resolveSvgCopyRaster } from "./svg-raster";
import { materializeSvgColorsForPreview } from "./svg-color-materialization";

export interface PreviewAsset {
  imageContent: string;
  previewRasterPath: string | null;
  tempPaths: string[];
}

interface LoadPreviewAssetOptions {
  format: string;
  imagePath: string;
  baseName: string;
  renderSvgPreview: (options: { materializedSvgContent: string; baseName: string }) => Promise<SvgRasterizationResult>;
}

interface ResolveSvgCopyAssetOptions {
  svgPath: string;
  previewRasterPath: string | null;
  baseName: string;
  renderSvgPreview: (options: { materializedSvgContent: string; baseName: string }) => Promise<SvgRasterizationResult>;
}

export async function loadPreviewAsset({
  format,
  imagePath,
  baseName,
  renderSvgPreview,
}: LoadPreviewAssetOptions): Promise<PreviewAsset> {
  if (format !== "svg") {
    const imageBuffer = fs.readFileSync(imagePath);
    return {
      imageContent: `data:image/png;base64,${imageBuffer.toString("base64")}`,
      previewRasterPath: imagePath,
      tempPaths: [],
    };
  }

  const svgContent = fs.readFileSync(imagePath, "utf-8");
  const materializedSvgContent = materializeSvgColorsForPreview(svgContent);

  try {
    const raster = await renderSvgPreview({
      materializedSvgContent,
      baseName,
    });
    const previewBuffer = fs.readFileSync(raster.path);

    return {
      imageContent: `data:image/png;base64,${previewBuffer.toString("base64")}`,
      previewRasterPath: raster.path,
      tempPaths: raster.tempPaths,
    };
  } catch {
    return {
      imageContent: `data:image/svg+xml;base64,${Buffer.from(materializedSvgContent, "utf-8").toString("base64")}`,
      previewRasterPath: null,
      tempPaths: [],
    };
  }
}

export async function resolveSvgCopyAsset({
  svgPath,
  previewRasterPath,
  baseName,
  renderSvgPreview,
}: ResolveSvgCopyAssetOptions): Promise<SvgRasterizationResult> {
  const svgContent = fs.readFileSync(svgPath, "utf-8");
  const materializedSvgContent = materializeSvgColorsForPreview(svgContent);

  return await resolveSvgCopyRaster({
    previewRasterPath,
    renderRaster: () =>
      renderSvgPreview({
        materializedSvgContent,
        baseName,
      }),
  });
}
