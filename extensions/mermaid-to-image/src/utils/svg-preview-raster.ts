import type { SvgRasterStrategy } from "../renderers/types";
import { BrowserBootstrapRequiredError } from "./browser-errors";
import { resolveCompatibleBrowser } from "./browser-manager";
import { renderSvgToRasterPreview, RenderSvgToRasterPreviewOptions } from "./svg-raster";
import { convertSvgToPngWithQuickLook, convertSvgToPngWithSips } from "./macos-image-tools";
import { renderSvgToRasterWithBrowser } from "./browser-svg-raster";

export const DEFAULT_SVG_PREVIEW_FACTORS = [3, 2, 1] as const;
export const DEFAULT_SVG_PREVIEW_MAX_EDGE = 4096;

export type SvgPreviewRenderer = RenderSvgToRasterPreviewOptions["renderWithQuickLook"];

export interface SvgPreviewRasterOptions {
  materializedSvgContent: string;
  baseName: string;
  tmpDir?: string;
  maxEdge?: number;
}

interface SvgPreviewRasterWithStrategyOptions extends SvgPreviewRasterOptions {
  strategy: SvgRasterStrategy;
}

export async function renderDefaultSvgPreviewRaster({
  materializedSvgContent,
  baseName,
  tmpDir,
  maxEdge = DEFAULT_SVG_PREVIEW_MAX_EDGE,
}: SvgPreviewRasterOptions) {
  return renderSvgToRasterPreview({
    materializedSvgContent,
    baseName,
    tmpDir,
    maxEdge,
    factors: DEFAULT_SVG_PREVIEW_FACTORS,
    renderWithQuickLook: convertSvgToPngWithQuickLook,
    renderWithSips: convertSvgToPngWithSips,
  });
}

export async function renderSvgPreviewRasterWithStrategy({
  strategy,
  materializedSvgContent,
  baseName,
  tmpDir,
  maxEdge,
}: SvgPreviewRasterWithStrategyOptions) {
  if (strategy === "browser") {
    const browser = await resolveCompatibleBrowser();
    if (!browser.executablePath) {
      throw new BrowserBootstrapRequiredError(
        "This SVG preview and image copy need a browser-backed rasterizer for correct fidelity.",
      );
    }

    return renderSvgToRasterWithBrowser({
      svgContent: materializedSvgContent,
      baseName,
      tmpDir,
      maxEdge,
      browserExecutablePath: browser.executablePath,
    });
  }

  return renderDefaultSvgPreviewRaster({
    materializedSvgContent,
    baseName,
    tmpDir,
    maxEdge,
  });
}
