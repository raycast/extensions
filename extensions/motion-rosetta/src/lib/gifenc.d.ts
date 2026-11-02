declare module "gifenc/dist/gifenc.js" {
  const gifenc: {
    GIFEncoder: typeof GIFEncoder;
    applyPalette: typeof applyPalette;
  };
  export default gifenc;
  export function applyPalette(
    rgba: Uint8Array,
    palette: number[][],
  ): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(
      pixels: Uint8Array,
      width: number,
      height: number,
      options: { palette: number[][]; delay: number; repeat: number },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
}
