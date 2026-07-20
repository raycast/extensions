import fs from "fs";
import os from "os";
import path from "path";
import { getSupersampledSize, parseSvgPixelDimensions, SvgPixelDimensions } from "./svg-preview";

export interface SvgRasterizationResult {
  path: string;
  tempPaths: string[];
}

export interface RenderSvgToRasterPreviewOptions {
  materializedSvgContent: string;
  baseName: string;
  tmpDir?: string;
  maxEdge?: number;
  factors?: readonly number[];
  renderWithQuickLook: (inputSvgPath: string, maxEdge: number) => Promise<string>;
  renderWithSips: (inputSvgPath: string, outputPngPath: string, width: number, height: number) => Promise<string>;
}

export interface ResolveSvgCopyRasterOptions {
  previewRasterPath?: string | null;
  renderRaster: () => Promise<SvgRasterizationResult>;
  fileExists?: (path: string) => boolean;
}

export const DEFAULT_SVG_RASTER_FACTORS = [3, 2, 1] as const;
export const DEFAULT_SVG_RASTER_MAX_EDGE = 4096;
const EXTREME_ASPECT_RATIO_THRESHOLD = 2.25;
const MAX_ACCEPTABLE_ASPECT_RATIO_DRIFT = 1.35;

function cleanupRasterTempFile(filePath: string): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort cleanup for temp files only.
  }
}

function getAspectRatio(dimensions: SvgPixelDimensions): number {
  return dimensions.width / dimensions.height;
}

function getAspectRatioDrift(a: number, b: number): number {
  return Math.max(a, b) / Math.min(a, b);
}

function shouldPreferSipsFirst(svgDimensions: SvgPixelDimensions | null): boolean {
  if (!svgDimensions) return false;
  return getAspectRatioDrift(svgDimensions.width, svgDimensions.height) >= EXTREME_ASPECT_RATIO_THRESHOLD;
}

function readPngPixelDimensions(filePath: string): SvgPixelDimensions | null {
  if (!fs.existsSync(filePath)) return null;

  const header = fs.readFileSync(filePath);
  if (header.length < 24) return null;

  const pngSignature = "89504e470d0a1a0a";
  if (header.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }

  if (header.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }

  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function hasAcceptableAspectRatio(rasterPath: string, sourceDimensions: SvgPixelDimensions | null): boolean {
  if (!sourceDimensions) return true;

  const rasterDimensions = readPngPixelDimensions(rasterPath);
  if (!rasterDimensions) return false;

  const sourceAspectRatio = getAspectRatio(sourceDimensions);
  const rasterAspectRatio = getAspectRatio(rasterDimensions);

  return getAspectRatioDrift(sourceAspectRatio, rasterAspectRatio) <= MAX_ACCEPTABLE_ASPECT_RATIO_DRIFT;
}

export async function renderSvgToRasterPreview({
  materializedSvgContent,
  baseName,
  tmpDir = os.tmpdir(),
  maxEdge = DEFAULT_SVG_RASTER_MAX_EDGE,
  factors = DEFAULT_SVG_RASTER_FACTORS,
  renderWithQuickLook,
  renderWithSips,
}: RenderSvgToRasterPreviewOptions): Promise<SvgRasterizationResult> {
  const svgDimensions = parseSvgPixelDimensions(materializedSvgContent);
  let previewPath: string | null = null;
  let lastConversionError: unknown = null;
  const attemptedPreviewPaths: string[] = [];
  const preferSipsFirst = shouldPreferSipsFirst(svgDimensions);

  for (const factor of factors) {
    const attemptSvgPath = path.join(tmpDir, `${baseName}-${factor}x.svg`);
    fs.writeFileSync(attemptSvgPath, materializedSvgContent, "utf-8");
    attemptedPreviewPaths.push(attemptSvgPath);

    const supersampled = svgDimensions
      ? getSupersampledSize(svgDimensions, factor, maxEdge)
      : { width: 2048, height: 2048 };
    const targetMaxEdge = Math.max(supersampled.width, supersampled.height);
    const sipsPath = path.join(tmpDir, `${baseName}-${factor}x-sips.png`);
    const candidates = preferSipsFirst
      ? [
          {
            kind: "sips",
            render: () => renderWithSips(attemptSvgPath, sipsPath, supersampled.width, supersampled.height),
          },
          {
            kind: "quickLook",
            render: () => renderWithQuickLook(attemptSvgPath, targetMaxEdge),
          },
        ]
      : [
          {
            kind: "quickLook",
            render: () => renderWithQuickLook(attemptSvgPath, targetMaxEdge),
          },
          {
            kind: "sips",
            render: () => renderWithSips(attemptSvgPath, sipsPath, supersampled.width, supersampled.height),
          },
        ];

    for (const candidate of candidates) {
      try {
        const candidatePath = await candidate.render();
        attemptedPreviewPaths.push(candidatePath);

        if (!hasAcceptableAspectRatio(candidatePath, svgDimensions)) {
          cleanupRasterTempFile(candidatePath);
          lastConversionError = new Error(`${candidate.kind} raster output aspect ratio drifted from the source SVG.`);
          continue;
        }

        previewPath = candidatePath;
        break;
      } catch (candidateError) {
        lastConversionError = candidateError;
      }
    }

    if (previewPath) {
      break;
    }
  }

  if (!previewPath) {
    for (const tempPath of attemptedPreviewPaths) {
      cleanupRasterTempFile(tempPath);
    }
    throw lastConversionError ?? new Error("Failed to convert SVG to PNG");
  }

  return {
    path: previewPath,
    tempPaths: attemptedPreviewPaths,
  };
}

export async function resolveSvgCopyRaster({
  previewRasterPath,
  renderRaster,
  fileExists = fs.existsSync,
}: ResolveSvgCopyRasterOptions): Promise<SvgRasterizationResult> {
  if (previewRasterPath && fileExists(previewRasterPath)) {
    return { path: previewRasterPath, tempPaths: [] };
  }

  return renderRaster();
}
