import fs from "fs/promises";
import { THEMES } from "beautiful-mermaid";
import { getOndineRuntime, ONDINE_VERSION } from "./ondine-runtime";
import {
  applyOndineTheme,
  hasMermaidThemeDirective,
  mapBeautifulThemeToOndine,
  ONDINE_THEME_WARNING,
} from "./ondine-theme";
import { materializeOndineSvg } from "../utils/ondine-svg-materialization";
import type { DiagramRequest, DiagramResult } from "./types";
import { writeOndinePng } from "./ondine-png";

interface OndineOptions {
  themeName?: string;
  originalSource?: string;
  now?: number;
  timeoutMs?: number;
}

export async function renderWithOndine(request: DiagramRequest, options: OndineOptions = {}): Promise<DiagramResult> {
  if (request.format === "png" && (request.requestedEngine !== "auto" || request.useOndineInAuto !== true)) {
    throw new Error(
      "Ondine Experimental supports SVG only. Change Output Format to SVG or choose Auto/Compatible for PNG.",
    );
  }
  const runtime = await getOndineRuntime();
  const themeName = options.themeName && THEMES[options.themeName] ? options.themeName : "github-light";
  const compiled = runtime.render(request.code, { responsive: false, now: options.now });
  const themed = applyOndineTheme(compiled.svg, mapBeautifulThemeToOndine(THEMES[themeName]));
  const svg = materializeOndineSvg(themed);
  try {
    if (request.format === "png") {
      await writeOndinePng(svg, request.outputPath, options.timeoutMs);
    } else {
      await fs.writeFile(request.outputPath, svg, "utf8");
    }
  } catch (error) {
    if (request.format === "svg") await fs.rm(request.outputPath, { force: true }).catch(() => undefined);
    throw error;
  }
  return {
    engine: "ondine",
    format: request.format,
    outputPath: request.outputPath,
    // Native output differs in font selection and background handling. Keep the
    // existing explicit browser setup flow until native fidelity is verified.
    svgRasterStrategy: request.format === "svg" ? "browser" : undefined,
    rendererMetadata: {
      version: ONDINE_VERSION,
      theme: themeName,
      warnings: hasMermaidThemeDirective(options.originalSource ?? request.code) ? [ONDINE_THEME_WARNING] : [],
    },
  };
}
