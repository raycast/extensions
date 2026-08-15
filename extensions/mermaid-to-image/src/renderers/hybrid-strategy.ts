import { resolveRenderer, supportsBeautifulMermaidSyntax } from "./select-renderer";
import { DiagramRequest, DiagramResult } from "./types";

export interface HybridRenderDependencies {
  renderBeautiful: (request: DiagramRequest) => Promise<DiagramResult>;
  renderMmdc: (request: DiagramRequest) => Promise<DiagramResult>;
  notifyAutoFallback?: (error: unknown) => Promise<void>;
}

export async function renderDiagramWithHybridStrategy(
  request: DiagramRequest,
  dependencies: HybridRenderDependencies,
): Promise<DiagramResult> {
  if (request.requestedEngine === "beautiful" && !supportsBeautifulMermaidSyntax(request.code)) {
    throw new Error("beautiful-mermaid does not support this Mermaid syntax yet. Switch to Compatible mode.");
  }

  const resolvedEngine = resolveRenderer(request);

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
