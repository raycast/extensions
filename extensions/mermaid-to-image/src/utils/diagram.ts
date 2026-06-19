import fs from "fs";
import path from "path";
import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MutableRefObject } from "react";
import { Preferences } from "../types";
import { renderWithMmdc } from "../renderers/mmdc";
import { renderWithBeautifulMermaid } from "../renderers/beautiful-mermaid";
import { DiagramFormat, DiagramRequest, DiagramResult, RenderEngine } from "../renderers/types";
import { renderDiagramWithHybridStrategy } from "../renderers/hybrid-strategy";
import { cleanMermaidCode } from "./mermaid-code";
import { logOperationalError, logOperationalEvent } from "./logger";

export interface DiagramOptions {
  scale?: number;
  width?: number;
  height?: number;
  outputFormat?: DiagramFormat;
  renderEngine?: RenderEngine;
  usePersistentOutputDir?: boolean;
}

function createOutputPath(format: DiagramFormat, usePersistentOutputDir: boolean): string {
  if (usePersistentOutputDir) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const diagramsDir = path.join(homeDir, "Downloads", "MermaidDiagrams");

    if (!fs.existsSync(diagramsDir)) {
      fs.mkdirSync(diagramsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    return path.join(diagramsDir, `mermaid-diagram-${timestamp}.${format}`);
  }

  return path.join(environment.supportPath, `diagram-${Date.now()}.${format}`);
}

export async function generateMermaidDiagram(
  mermaidCode: string,
  tempFileRef: MutableRefObject<string | null>,
  options?: DiagramOptions,
): Promise<DiagramResult> {
  const preferences = getPreferenceValues<Preferences>();
  const fallbackRenderer = options?.renderEngine ?? preferences.renderEngine ?? "auto";
  const fallbackFormat = options?.outputFormat ?? preferences.outputFormat ?? "svg";

  try {
    const cleanCode = cleanMermaidCode(mermaidCode);
    const outputFormat = fallbackFormat;
    const requestedEngine = fallbackRenderer;
    const outputPath = createOutputPath(outputFormat, Boolean(options?.usePersistentOutputDir));

    const timeoutValue = preferences.generationTimeout || 10;
    const timeoutMs = (typeof timeoutValue !== "number" || timeoutValue <= 0 ? 10 : timeoutValue) * 1000;

    const request: DiagramRequest = {
      code: cleanCode,
      format: outputFormat,
      requestedEngine,
      outputPath,
    };

    return await renderDiagramWithHybridStrategy(request, {
      renderBeautiful: (currentRequest) =>
        renderWithBeautifulMermaid(currentRequest, {
          themeName: preferences.beautifulTheme ?? "github-light",
          customPath: preferences.customBeautifulMermaidPath,
        }),
      renderMmdc: (currentRequest) =>
        renderWithMmdc(currentRequest, {
          preferences,
          timeoutMs,
          scale: options?.scale,
          width: options?.width,
          height: options?.height,
          tempFileRef,
        }),
      notifyAutoFallback: async () => {
        logOperationalEvent("auto-renderer-fallback", {
          renderer: "mmdc",
          format: outputFormat,
        });
        await showToast({
          style: Toast.Style.Animated,
          title: "Using compatible renderer fallback",
        });
      },
    });
  } catch (error) {
    logOperationalError("generate-mermaid-diagram-failed", error, {
      renderer: fallbackRenderer,
      format: fallbackFormat,
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unexpected error occurred during diagram generation.");
  }
}
