declare module "culori" {
  export interface Color {
    mode: string;
    r?: number;
    g?: number;
    b?: number;
    alpha?: number;
    l?: number;
    c?: number;
    h?: number;
  }

  export function parse(color: string): Color | undefined;
  export function formatHex(color: Color): string;
  export function formatRgb(color: Color): string;
  export function formatCss(color: Color): string;
  export function oklch(color: Color): Color | undefined;
}
