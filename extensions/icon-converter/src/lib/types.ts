import type { RGBA } from "./image";

export type OptionKey = "quality" | "background" | "colors";

export interface ConvertOptions {
  /** 1-100, or "lossless" where the format supports it. */
  quality?: number | "lossless";
  /** Fill colour used when the target has no transparency. */
  background?: [number, number, number];
  /** Palette size when tracing to SVG. */
  colors?: number;
  /** Output width in px when rasterising an SVG (default: the SVG's own size). */
  width?: number;
}

/** What a target gets to work with, whatever the input was. */
export interface Source {
  /** Present only for vector input. */
  svg?: { text: string; width: number; height: number };
  /**
   * Pixels of the input. For vector input, `maxSide` renders at that size
   * (crisp at any scale); raster input ignores it and returns the full image.
   */
  raster(maxSide?: number): Promise<RGBA>;
}

export interface InputFormat {
  id: string;
  label: string;
  extensions: string[];
  vector?: boolean;
  open(bytes: Uint8Array, options: ConvertOptions): Promise<Source>;
}

export interface OutputFormat {
  id: string;
  label: string;
  extension: string;
  /** Which settings the form should offer for this target. */
  options: OptionKey[];
  /** Whether a vector input may be rendered at a user-chosen width. */
  sizable?: boolean;
  write(source: Source, options: ConvertOptions): Promise<Uint8Array>;
}
