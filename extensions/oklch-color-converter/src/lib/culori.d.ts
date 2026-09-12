declare module "culori" {
  export interface RgbColor {
    mode: "rgb";
    r: number;
    g: number;
    b: number;
    alpha?: number;
  }

  export interface OklchColor {
    mode: "oklch";
    l: number;
    c: number;
    h: number;
    alpha?: number;
  }

  export interface OklabColor {
    mode: "oklab";
    l: number;
    a: number;
    b: number;
    alpha?: number;
  }

  export interface P3Color {
    mode: "p3";
    r: number;
    g: number;
    b: number;
    alpha?: number;
  }

  export interface HslColor {
    mode: "hsl";
    h: number;
    s: number;
    l: number;
    alpha?: number;
  }

  export type Color = RgbColor | OklchColor | OklabColor | P3Color | HslColor;
  export type ColorMode = "rgb" | "oklch" | "p3" | "oklab" | "hsl";

  export function rgb(color: Color): RgbColor;
  export function p3(color: Color): P3Color;
  export function lch(color: Color): OklchColor;
  export function oklch(color: Color): OklchColor;
  export function oklab(color: Color): OklabColor;
  export function parse(color: string): Color | null;
  export function formatHex(color: Color): string;
  export function formatRgb(color: Color): string;

  export const modeXyz65: ColorMode;
  export function useMode(mode: ColorMode): (color: Color) => Color;
}
