import { Clipboard, showHUD } from "@raycast/api";
import { SearchItem } from "@/types";
import { familyStylesByPrefix } from "@/utils/data";

export const copySvgToClipboard = async (icon: SearchItem) => {
  // Since v6, Font Awesome stopped setting the SVGs fill color to currentColor, this restores that behavior.
  const svgWithCurrentColor = icon.svgs[0]["html"].toString().replace(/<path/g, '<path fill="currentColor"');
  await Clipboard.copy(svgWithCurrentColor);
  await showHUD("Copied SVG to clipboard!");
};

export const copyFAGlyphToClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(String.fromCharCode(parseInt(icon.unicode, 16)));
  await showHUD("Copied glyph to clipboard!");
};

export const copyFAUnicodeClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(icon.unicode);
  await showHUD("Copied unicode to clipboard!");
};

export const copyFAClassesToClipboard = async (icon: SearchItem) => {
  // Get first style of icon, or use the default iconStyle
  const faClass = `fa-${familyStylesByPrefix[icon.svgs[0].familyStyle.prefix].split(", ")[1].toLowerCase()} fa-${
    icon.id
  }`;
  await Clipboard.copy(faClass);
  await showHUD("Copied classes to clipboard!");
};

export const copyFASlugToClipboard = async (icon: SearchItem) => {
  await Clipboard.copy(icon.id);
  await showHUD("Copied slug to clipboard!");
};
