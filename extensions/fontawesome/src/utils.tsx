import { SearchItem } from './types';
import { Clipboard, showHUD } from '@raycast/api';

export const copySvgToClipboard = async (icon: SearchItem) => {
  // Since v6, Font Awesome stopped setting the SVGs fill color to currentColor, this restores that behavior.
  const svgWithCurrentColor = icon.svgs[0].toString().replace(/<path/g, '<path fill="currentColor"');
  await Clipboard.copy(svgWithCurrentColor);
  await showHUD('Copied SVG to clipboard!');
};

export const copyFAGlyphToClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(String.fromCharCode(parseInt(icon.unicode, 16)));
  await showHUD('Copied Glyph to clipboard!');
};

export const copyFAUnicodeClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(icon.unicode);
  await showHUD('Copied Glyph to clipboard!');
};

export const copyFAClassesToClipboard = async (icon: SearchItem) => {
  // Get first style of icon, or use the default iconStyle
  const faClass = `fa-${familyStylesByPrefix[icon.svgs[0].familyStyle.prefix].split(', ')[1].toLowerCase()} fa-${
    icon.id
  }`;
  await Clipboard.copy(faClass);
  await showHUD('Copied Classes to clipboard!');
};

export const copyFASlugToClipboard = async (icon: SearchItem) => {
  await Clipboard.copy(icon.id);
  await showHUD('Copied Slug to clipboard!');
};

export const familyStylesByPrefix: { [key: string]: string } = {
  fass: 'Sharp, Solid',
  fasr: 'Sharp, Regular',
  fasl: 'Sharp, Light',
  fast: 'Sharp, Thin',
  fad: 'Duotone, Solid',
  fas: 'Classic, Solid',
  far: 'Classic, Regular',
  fal: 'Classic, Light',
  fat: 'Classic, Thin',
  fab: 'Classic, Brands',
};

export function iconForStyle(prefix: string) {
  if (prefix === 'fast' || prefix === 'fat') {
    return 'thin.svg';
  } else if (prefix === 'fasr' || prefix === 'far') {
    return 'regular.svg';
  } else if (prefix === 'fasl' || prefix === 'fal') {
    return 'light.svg';
  } else if (prefix === 'fass' || prefix === 'fas') {
    return 'solid.svg';
  } else if (prefix === 'fad') {
    return 'duotone.svg';
  } else {
    return 'brand.svg';
  }
}
