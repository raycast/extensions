import type { DiagramFormat, RenderEngine } from "../renderers/types";
import { resolveRenderer } from "../renderers/select-renderer";
import type { CompatibleBrowserResolution } from "./browser-manager";

interface BrowserBootstrapRequest {
  code: string;
  format: DiagramFormat;
  requestedEngine: RenderEngine;
}

export interface BrowserBootstrapState {
  reason: string;
}

export function resolveBrowserBootstrapState(
  request: BrowserBootstrapRequest,
  browser: Pick<CompatibleBrowserResolution, "source">,
): BrowserBootstrapState | null {
  if (browser.source !== "missing") {
    return null;
  }

  if (resolveRenderer(request) !== "mmdc") {
    return null;
  }

  if (request.requestedEngine === "compatible") {
    return {
      reason: "Compatible mode was selected, and it needs a browser binary.",
    };
  }

  if (request.format === "png") {
    return {
      reason: "PNG output uses the compatible renderer, which needs a browser binary.",
    };
  }

  return {
    reason:
      "This Mermaid syntax is not supported by beautiful-mermaid, so compatible rendering needs a browser binary.",
  };
}
