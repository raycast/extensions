declare module "apca-w3" {
  /** Returns the signed APCA Lc value. Text luminance first; polarity matters. */
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;
  /** Converts an 8-bit sRGB triplet (0–255) to APCA screen luminance Y. */
  export function sRGBtoY(rgb: [number, number, number]): number;
  /** Returns [Lc, minSize@100, minSize@200, …, minSize@900]. 999 = unusable, 777 = non-text only. */
  export function fontLookupAPCA(contrast: number, places?: number): [string, ...number[]];
}
