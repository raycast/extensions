import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  basePixel?: string;
}

const loadBasePixelsFromPreferences = () => {
  const basePixel =
    getPreferenceValues<Preferences>().basePixel === "" ? 16 : Number(getPreferenceValues<Preferences>().basePixel);
  if (isNaN(basePixel)) {
    return 16;
  }
  return basePixel;
};

const BASE_FONT_PIXELS = loadBasePixelsFromPreferences();

export const REMtoPX = (rem: number) => rem * BASE_FONT_PIXELS;

export const REMtoPT = (rem: number): number => rem * 12;

export const PXtoREM = (px: number): number => px / BASE_FONT_PIXELS;

export const PXtoPT = (px: number): number => px * 0.75;

export const PTtoREM = (pt: number): number => pt / 12;

export const PTtoPX = (pt: number): number => pt / 0.75;
