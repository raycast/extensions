// Ambient type declarations for the color libraries this project depends on.
// culori, apca-w3, and colorparsley ship no TypeScript types, so we declare the
// (small) surface we actually use. Keeping these here lets `src/lib` stay pure
// and type-checked without pulling in any extra `@types/*` packages.

declare module "culori" {
  export interface CuloriColor {
    mode: string;
    l?: number;
    c?: number;
    h?: number;
    r?: number;
    g?: number;
    b?: number;
    alpha?: number;
    [channel: string]: number | string | undefined;
  }

  /** Parse any CSS color string; returns `undefined` for unparseable input. */
  export function parse(color: string): CuloriColor | undefined;

  /** WCAG 2.x contrast ratio (1..21). Accepts strings (incl. `oklch()`) or color objects. */
  export function wcagContrast(a: string | CuloriColor, b: string | CuloriColor): number;

  /** WCAG relative luminance (0..1). */
  export function wcagLuminance(color: string | CuloriColor): number;

  /** Build a converter to the given color space. */
  export function converter(mode: string): (color: string | CuloriColor) => CuloriColor;

  /** Format a color as `#rrggbb` (or `#rrggbbaa`); `undefined` if not representable. */
  export function formatHex(color: string | CuloriColor): string | undefined;

  /** Reduce chroma until the color fits the target gamut, returned in `mode`. */
  export function clampChroma(color: CuloriColor, mode?: string, rgbGamut?: string): CuloriColor;

  /** Alpha-composite a stack of colors (bottom-first) using the given blend mode. */
  export function blend(colors: Array<string | CuloriColor>, mode?: string): CuloriColor;
}

declare module "apca-w3" {
  /** Signed APCA lightness contrast (Lc). Negative = light text on a dark background. */
  export function calcAPCA(
    text: string | number[],
    background: string | number[],
    places?: number,
    isInt?: boolean,
  ): number;

  /** `[lcString, w100, w200, ..., w900]`; indices 1..9 are min font px per weight (>=777 = unusable). */
  export function fontLookupAPCA(contrast: number, places?: number): Array<string | number>;

  export function APCAcontrast(textY: number, bgY: number, places?: number): number | string;
  export function sRGBtoY(rgb: number[]): number;
}

declare module "colorparsley" {
  export function colorParsley(color: string | number[]): number[];
}
