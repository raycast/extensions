import type { MutableRefObject } from "react";
import type { DiagramFormat, DiagramRequest, ResolvedEngine, SvgRasterStrategy } from "../renderers/types";
import { Preferences } from "../types";
import { generateMermaidDiagram } from "./diagram";
import { getInputResolutionErrorMessage, InputResolutionError, ResolvedMermaidInput } from "./mermaid-input";
import { logOperationalError, logOperationalEvent } from "./logger";
import { resolveBrowserBootstrapState } from "./browser-bootstrap-state";
import {
  type CompatibleBrowserResolution,
  resolveCompatibleBrowser as defaultResolveCompatibleBrowser,
} from "./browser-manager";
import { BrowserBootstrapRequiredError } from "./browser-errors";

export interface ManualDiagramResult {
  outputPath: string;
  format: DiagramFormat;
  engine: ResolvedEngine;
  svgRasterStrategy?: SvgRasterStrategy;
}

export interface BrowserSetupContext {
  input: ResolvedMermaidInput;
  reason: string;
}

export type ManualGenerationState =
  | { kind: "success"; result: ManualDiagramResult; mermaidCode: string }
  | { kind: "browser-setup"; setup: BrowserSetupContext }
  | { kind: "error"; message: string; error: unknown };

export interface ManualDiagramExecutionContext {
  preferences: Pick<Preferences, "outputFormat" | "renderEngine">;
  tempFileRef: MutableRefObject<string | null>;
}

export interface ManualDiagramExecutionOptions extends ManualDiagramExecutionContext {
  skipBrowserCheck?: boolean;
  resolveCompatibleBrowser?: () => Promise<CompatibleBrowserResolution>;
}

export function buildManualDiagramRequest(
  code: string,
  preferences: Pick<Preferences, "outputFormat" | "renderEngine">,
): DiagramRequest {
  return {
    code,
    format: preferences.outputFormat ?? "svg",
    requestedEngine: preferences.renderEngine ?? "auto",
    outputPath: "",
  };
}

export async function runManualDiagramGeneration(
  resolvedInput: ResolvedMermaidInput,
  options: ManualDiagramExecutionOptions,
): Promise<ManualGenerationState> {
  const { preferences, tempFileRef, skipBrowserCheck = false } = options;
  const request = buildManualDiagramRequest(resolvedInput.code, preferences);

  try {
    logOperationalEvent("manual-diagram-generation-started", {
      source: resolvedInput.source,
      renderer: preferences.renderEngine,
      format: request.format,
    });

    if (!skipBrowserCheck) {
      const resolveCompatibleBrowser = options.resolveCompatibleBrowser ?? defaultResolveCompatibleBrowser;
      const browserResolution = await resolveCompatibleBrowser();
      const setupState = resolveBrowserBootstrapState(request, browserResolution);

      if (setupState) {
        return {
          kind: "browser-setup",
          setup: { input: resolvedInput, reason: setupState.reason },
        };
      }
    }

    const result = await generateMermaidDiagram(resolvedInput.code, tempFileRef, {
      renderEngine: preferences.renderEngine,
    });

    if (result.format === "svg" && result.svgRasterStrategy === "browser") {
      const resolveCompatibleBrowser = options.resolveCompatibleBrowser ?? defaultResolveCompatibleBrowser;
      const browserResolution = await resolveCompatibleBrowser();

      if (browserResolution.source === "missing") {
        return {
          kind: "browser-setup",
          setup: {
            input: resolvedInput,
            reason: "This SVG preview and image copy need a browser-backed rasterizer for correct fidelity.",
          },
        };
      }
    }

    logOperationalEvent("manual-diagram-generation-success", {
      source: resolvedInput.source,
      engine: result.engine,
      outputFormat: result.format,
    });

    return {
      kind: "success",
      result,
      mermaidCode: resolvedInput.code,
    };
  } catch (error) {
    if (error instanceof BrowserBootstrapRequiredError) {
      return {
        kind: "browser-setup",
        setup: {
          input: resolvedInput,
          reason: "Compatible rendering still needs a browser binary for this request.",
        },
      };
    }

    const message =
      error instanceof InputResolutionError
        ? getInputResolutionErrorMessage(error)
        : error instanceof Error
          ? error.message
          : String(error);

    logOperationalError("manual-diagram-generation-failed", error, {
      source: resolvedInput.source,
      renderer: preferences.renderEngine,
      format: request.format,
      reason: message,
    });

    return {
      kind: "error",
      message,
      error,
    };
  }
}
