export type RenderEngine = "auto" | "beautiful" | "compatible";
export type ResolvedEngine = "beautiful" | "mmdc";
export type DiagramFormat = "svg" | "png";
export type SvgRasterStrategy = "macos" | "browser";

export interface DiagramRequest {
  code: string;
  format: DiagramFormat;
  requestedEngine: RenderEngine;
  outputPath: string;
}

export interface DiagramResult {
  engine: ResolvedEngine;
  format: DiagramFormat;
  outputPath: string;
  svgRasterStrategy?: SvgRasterStrategy;
}

export interface DiagramRenderer {
  engine: ResolvedEngine;
  canRender(request: DiagramRequest): boolean;
  render(request: DiagramRequest): Promise<DiagramResult>;
}
