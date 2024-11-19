import { Image } from "@raycast/api";
import { getFlavorPreference } from "./preferences.util";

type ColorInput = string | undefined;

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

const formatColor = (color: ColorInput = "#FFFFFF"): string => {
  if (!color) return "ffffff";

  if (typeof color === "string" && !color.includes("#")) {
    const currentFlavor = getFlavorPreference();
    const catppuccinColor = currentFlavor.colorEntries.find(([name]) => name.toLowerCase() === color.toLowerCase());
    if (catppuccinColor) {
      return catppuccinColor[1].hex.replace("#", "");
    }
  }

  return color.replace("#", "");
};

export const getIcon = (iconName: string, color: ColorInput = "#FFFFFF"): Image.ImageLike => {
  if (!iconName) {
    return getDefaultIcon(color);
  }

  const normalizedIconName = iconName.toLowerCase();
  const formattedColor = formatColor(color);

  // check if icon ends .svg indiciating that it must be grabbed from the website repo
  // using known hash
  if (normalizedIconName.endsWith(".svg")) {
    return {
      source: `https://raw.githubusercontent.com/catppuccin/website/69e2f3ee385279ea34e84c2c42703ed997eab40c/src/icons/ports/${normalizedIconName}`,
      tintColor: {
        light: formattedColor,
        dark: formattedColor,
        adjustContrast: false,
      },
    };
  }

  if (INVALID_ICONS.has(normalizedIconName)) {
    return getDefaultIcon(color);
  }

  const encodedIconName = encodeURIComponent(normalizedIconName);
  const encodedColor = encodeURIComponent(formattedColor.toLowerCase());

  return `https://cdn.simpleicons.org/${encodedIconName}/${encodedColor}`;
};

export const getDefaultIcon = (color: ColorInput = "#FFFFFF"): Image.ImageLike => {
  let resolvedColor = color;
  if (color && !color.includes("#")) {
    const currentFlavor = getFlavorPreference();
    const catppuccinColor = currentFlavor.colorEntries.find(([name]) => name === color);
    if (catppuccinColor) {
      resolvedColor = catppuccinColor[1].hex;
    }
  }

  const DEFAULT_SVG_PATH = `<svg xmlns="http://www.w3.org/2000/svg" fill="${resolvedColor}" width="24" height="24" viewBox="0 0 256 256"><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,120,47.65,76,128,32l80.35,44Zm8,99.64V133.83l80-43.78v85.76Z"></path></svg>`;

  const formattedColor = resolvedColor?.startsWith("#") ? resolvedColor : `#${formatColor(resolvedColor)}`;
  const coloredSVG = DEFAULT_SVG_PATH.replace('fill="#FFFFFF"', `fill="${formattedColor}"`);
  const ENCODED_SVG = Buffer.from(coloredSVG).toString("base64");

  return `data:image/svg+xml;base64,${ENCODED_SVG}`;
};

export const getCatppuccinColor = (colorName: string): string => {
  const currentFlavor = getFlavorPreference();
  const color = currentFlavor.colorEntries.find(([name]) => name === colorName);
  return color ? color[1].hex : "#FFFFFF";
};
