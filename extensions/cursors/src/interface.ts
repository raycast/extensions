export interface Cursor {
  id: string;
  name: string;
  svg: string;
  /**
   * `true` for macOS-specific cursors with no CSS/HTML equivalent
   * (e.g. `poof`, `beachball`). Rendered with a subtle accessory in the grid.
   */
  nonStandard?: boolean;
}

/** PNG sizes offered by the Copy / Paste / Save as PNG submenus. */
export const PNG_SIZES = [16, 32, 64, 128, 256, 512] as const;

export type PngSize = (typeof PNG_SIZES)[number];
