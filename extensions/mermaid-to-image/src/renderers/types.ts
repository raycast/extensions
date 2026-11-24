export type RenderEngine = "auto" | "beautiful" | "compatible" | "ondine";
export type ResolvedEngine = "beautiful" | "mmdc" | "ondine";
export type DiagramFormat = "svg" | "png";
export type SvgRasterStrategy = "macos" | "browser";

export interface DiagramRequest {
  code: string;
  format: DiagramFormat;
  requestedEngine: RenderEngine;
  outputPath: string;
  useOndineInAuto?: boolean;
  originalSource?: string;
}

export interface DiagramResult {
  engine: ResolvedEngine;
  format: DiagramFormat;
  outputPath: string;
  svgRasterStrategy?: SvgRasterStrategy;
  rendererMetadata?: RendererMetadata;
}

export interface RendererMetadata {
  version: string;
  theme: string;
  warnings: string[];
}

export interface DiagramRenderer {
  engine: ResolvedEngine;
  canRender(request: DiagramRequest): boolean;
  render(request: DiagramRequest): Promise<DiagramResult>;
}
