export const opacityToHex = (opacity: number) => {
  const num = Math.round(255 * opacity);
  const hex = num.toString(16);
  return hex.length < 2 ? "0" + hex : hex;
};

export interface AllColors {
  color: string;
  rgb: string;
  hex: string;
  hsl: string;
}

export interface AllOpacity {
  opacity: string;
  opacityHex: string;
}
