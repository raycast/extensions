import fs from "fs";
import path from "path";
import { DiagramRequest, DiagramResult } from "./types";
import { resolveBeautifulMermaidRuntime } from "./beautiful-mermaid-runtime";
import { resolveSvgRasterStrategy } from "../utils/svg-raster-strategy";

export interface BeautifulMermaidRenderOptions {
  themeName: string;
  customPath?: string;
}

export async function renderWithBeautifulMermaid(
  request: DiagramRequest,
  options: BeautifulMermaidRenderOptions,
): Promise<DiagramResult> {
  if (request.format !== "svg") {
    throw new Error("beautiful-mermaid renderer only supports SVG output.");
  }

  const runtime = await resolveBeautifulMermaidRuntime({
    customPath: options.customPath,
    notifyBundledFallback: true,
  });
  const { renderMermaidSVG, THEMES } = runtime.module;
  const fallbackThemeName = "github-light";
  const selectedTheme = THEMES[options.themeName] ?? THEMES[fallbackThemeName];

  const svg = renderMermaidSVG(request.code, {
    ...selectedTheme,
    transparent: true,
  });

  fs.mkdirSync(path.dirname(request.outputPath), { recursive: true });
  fs.writeFileSync(request.outputPath, svg, "utf-8");

  return {
    engine: "beautiful",
    format: "svg",
    outputPath: request.outputPath,
    svgRasterStrategy: resolveSvgRasterStrategy(svg),
  };
}
