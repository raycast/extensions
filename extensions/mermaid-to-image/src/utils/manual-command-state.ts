import { type DiagramFormat, type ResolvedEngine, type SvgRasterStrategy } from "../renderers/types";
import { type BrowserSetupContext, type ManualGenerationState } from "./manual-command-service";

export interface ManualCommandState {
  isLoading: boolean;
  error: string | null;
  browserSetup: BrowserSetupContext | null;
  imagePath: string | null;
  imageFormat: DiagramFormat;
  engineUsed: ResolvedEngine | null;
  svgRasterStrategy: SvgRasterStrategy | null;
  mermaidCode: string | null;
}

export function createInitialManualCommandState(defaultFormat: DiagramFormat): ManualCommandState {
  return {
    isLoading: true,
    error: null,
    browserSetup: null,
    imagePath: null,
    imageFormat: defaultFormat,
    engineUsed: null,
    svgRasterStrategy: null,
    mermaidCode: null,
  };
}

export function createIdleManualCommandState(defaultFormat: DiagramFormat): ManualCommandState {
  return {
    ...createInitialManualCommandState(defaultFormat),
    isLoading: false,
  };
}

export function createPendingManualCommandState(previous: ManualCommandState): ManualCommandState {
  return {
    ...previous,
    isLoading: true,
    error: null,
    browserSetup: null,
    imagePath: null,
    engineUsed: null,
    svgRasterStrategy: null,
    mermaidCode: null,
  };
}

export function createFatalManualCommandState(previous: ManualCommandState, message: string): ManualCommandState {
  return {
    ...previous,
    isLoading: false,
    error: message,
    browserSetup: null,
    imagePath: null,
    engineUsed: null,
    svgRasterStrategy: null,
    mermaidCode: null,
  };
}

export function mapManualGenerationStateToCommandState(
  previous: ManualCommandState,
  result: ManualGenerationState,
): ManualCommandState {
  if (result.kind === "browser-setup") {
    return {
      ...previous,
      isLoading: false,
      error: null,
      browserSetup: result.setup,
      imagePath: null,
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    };
  }

  if (result.kind === "error") {
    return {
      ...previous,
      isLoading: false,
      browserSetup: null,
      error: result.message,
      imagePath: null,
      engineUsed: null,
      svgRasterStrategy: null,
      mermaidCode: null,
    };
  }

  return {
    ...previous,
    isLoading: false,
    browserSetup: null,
    error: null,
    imagePath: result.result.outputPath,
    imageFormat: result.result.format,
    engineUsed: result.result.engine,
    svgRasterStrategy: result.result.svgRasterStrategy ?? null,
    mermaidCode: result.mermaidCode,
  };
}
