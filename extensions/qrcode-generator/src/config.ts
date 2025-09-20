export const QR_OPTIONS = {
  width: 512,
  color: {
    dark: "#000000",
    light: "#00000000", // transparent RGBA
  },
} as const;

export const QR_OPTIONS_PREVIEW = {
  width: 512,
  color: {
    dark: "#000000",
    light: "#FFFFFF", // white background for visibility
  },
} as const;

export const SVG_OPTIONS = {
  width: 1536,
  color: {
    dark: "#000000",
    light: "none",
  },
} as const;
