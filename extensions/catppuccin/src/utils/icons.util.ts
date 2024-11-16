import type { Image } from "@raycast/api";
import { getFlavorPreference } from "./preferences.util";
import { flavors, type ColorName } from "@catppuccin/palette";

const INVALID_ICONS = new Set([
  "twitter",
  "microsoftword",
  "microsoftazure",
  "microsoftpowerpoint",
  "powershell",
  "windowsterminal",
  "visualstudio",
  "visualstudiocode",
]);

export const isInvalidIcon = (iconName: string) => INVALID_ICONS.has(iconName);

export const getIcon = (icon: string, color: ColorName): Image.ImageLike => {
  const hex = getHexForColor(color);

  // Icons ending with .svg refer to custom SVG assets from the catppuccin/website repository.
  if (icon.endsWith(".svg")) {
    return {
      source: `https://raw.githubusercontent.com/catppuccin/website/69e2f3ee385279ea34e84c2c42703ed997eab40c/src/icons/ports/${icon}`,
      tintColor: {
        light: hex,
        dark: hex,
        adjustContrast: false,
      },
    };
  }

  return `https://cdn.simpleicons.org/${encodeURIComponent(icon)}/${encodeURIComponent(hex)}`;
};

export const getDefaultIcon = (color: ColorName): Image.ImageLike => {
  const hex = getHexForColor(color);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="${hex}" width="24" height="24" viewBox="0 0 256 256"><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,120,47.65,76,128,32l80.35,44Zm8,99.64V133.83l80-43.78v85.76Z"></path></svg>`;
  const encodedSvg = Buffer.from(svg).toString("base64");

  return `data:image/svg+xml;base64,${encodedSvg}`;
};

export const getHexForColor = (colorName: ColorName): string => {
  const currentFlavor = getFlavorPreference();
  return flavors[currentFlavor].colors[colorName].hex;
};
