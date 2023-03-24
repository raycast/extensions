import { BackgroundColor, Theme, Color } from "@adobe/leonardo-contrast-colors";
import ColorScheme from "color-scheme";

// Define Palette Formate
type Palette = {
  category: string;
  description: string;
  detial: Color[];
};

// Define Color Fromate
type Color = {
  name: string;
  hex: string;
};

// Generate Colors by color-scheme and adobe/leonardo-contrast-colors
export const generateColors = (schemeType: string): Color[] => {
  const scheme = new ColorScheme();
  scheme
    .from_hue(Math.floor(Math.random() * 360))
    .scheme(schemeType)
    .variation("soft");

  const colors = scheme.colors().map((color: string) => {
    return new Color({
      name: `${schemeType}`,
      colorKeys: [color],
      ratios: [3, 4.5],
    });
  });

  const baseBackgroundColor = new BackgroundColor({
    name: "BG",
    colorKeys: ["#CADADA"],
  });

  const theme = new Theme({ colors, backgroundColor: baseBackgroundColor, lightness: 10 });

  return theme.contrastColorValues.map((color: string, index: number) => {
    return {
      name: `${schemeType}${index + 1}`,
      hex: color.toUpperCase(),
    };
  });
};

// Generate Palette by four kinds of generated Colors
export const generatePalettes = (): Palette[] => {
  const dg_mono = {
    category: "Mono",
    description: "Mono Scheme Palette",
    detial: generateColors("mono"),
  };

  const dg_contrast = {
    category: "Contrast",
    description: "Contrast Scheme Palette",
    detial: generateColors("contrast"),
  };

  const dg_tetrade = {
    category: "Tetrade",
    description: "Tetrade Scheme Palette",
    detial: generateColors("tetrade"),
  };

  const dg_analogic = {
    category: "Analogic",
    description: "Analogic Scheme Palette",
    detial: generateColors("analogic"),
  };

  return [dg_mono, dg_contrast, dg_tetrade, dg_analogic];
};
