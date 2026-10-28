import { getOndineAutoFamily, resolveRenderer, supportsBeautifulMermaidSyntax } from "./select-renderer";
import { getOndineDiagnostic } from "./ondine-runtime";
import { logOperationalEvent } from "../utils/logger";
import { DiagramRequest, DiagramResult } from "./types";

export interface HybridRenderDependencies {
  renderBeautiful: (request: DiagramRequest) => Promise<DiagramResult>;
  renderMmdc: (request: DiagramRequest) => Promise<DiagramResult>;
  renderOndine?: (request: DiagramRequest) => Promise<DiagramResult>;
  notifyAutoFallback?: (error: unknown) => Promise<void>;
}

export async function renderDiagramWithHybridStrategy(
  request: DiagramRequest,
  dependencies: HybridRenderDependencies,
): Promise<DiagramResult> {
  if (request.requestedEngine === "ondine") {
    if (request.format !== "svg")
      throw new Error(
        "Ondine Experimental supports SVG only. Change Output Format to SVG or choose Auto/Compatible for PNG.",
      );
    if (!dependencies.renderOndine) throw new Error("Ondine renderer is unavailable.");
    return dependencies.renderOndine(request);
  }

  if (request.requestedEngine === "beautiful" && !supportsBeautifulMermaidSyntax(request.code)) {
    throw new Error("beautiful-mermaid does not support this Mermaid syntax yet. Switch to Compatible mode.");
  }

  const resolvedEngine = resolveRenderer(request);

  if (resolvedEngine === "ondine") {
    try {
      if (!dependencies.renderOndine) throw new Error("Ondine renderer is unavailable.");
      return await dependencies.renderOndine(request);
    } catch (error) {
      const code = getOndineDiagnostic(error)?.code;
      const errorCode =
        code && ["syntax", "semantic", "unsupported-diagram", "limit"].includes(code) ? code : "unexpected";
      logOperationalEvent("ondine-auto-fallback", {
        renderer: "ondine",
        fallbackRenderer: "mmdc",
        family: getOndineAutoFamily(request.code) ?? "unknown",
        errorCode,
      });
      // No source-bearing diagnostics or toast; final mmdc errors stay outside this catch.
    }
    return dependencies.renderMmdc(request);
  }

  try {
    if (resolvedEngine === "beautiful") {
      return await dependencies.renderBeautiful(request);
    }
    return await dependencies.renderMmdc(request);
  } catch (error) {
    if (resolvedEngine === "beautiful" && request.requestedEngine === "auto") {
      if (dependencies.notifyAutoFallback) {
        await dependencies.notifyAutoFallback(error);
      }
      return await dependencies.renderMmdc(request);
    }
    throw error;
  }
}
