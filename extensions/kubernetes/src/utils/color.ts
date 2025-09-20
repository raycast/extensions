import { Color } from "@raycast/api";

type ColorPalette = [Color.Raw, Color.Raw, Color.Raw, Color.Raw];

const lightColors: ColorPalette = ["#18122B", "#150050", "#3F0071", "#610094"];

const darkColors: ColorPalette = ["#F1EAFF", "#E5D4FF", "#DCBFFF", "#D0A2F7"];

export function getLightColor(index: number): Color.Raw {
  return lightColors[index % lightColors.length];
}

export function getDarkColor(index: number): Color.Raw {
  return darkColors[index % darkColors.length];
}
