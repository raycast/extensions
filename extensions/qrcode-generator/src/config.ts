export const PNG_OPTIONS = {
  type: "image/png",
  width: 512,
  color: {
    dark: "#000000",
    light: "#00000000", // transparent RGBA
  },
} as const;

export const JPEG_OPTIONS = {
  type: "image/jpeg",
  width: 512,
  color: {
    dark: "#000000",
    light: "#00000000", // transparent RGBA
  },
} as const;

export const SVG_OPTIONS = {
  width: 1536,
  color: {
    dark: "#000000",
    light: "none",
  },
} as const;
