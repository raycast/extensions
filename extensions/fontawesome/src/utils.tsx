import { Icon, IconStyle, Preferences, SearchItem } from './types';
import { Clipboard, showHUD, getPreferenceValues, LocalStorage } from '@raycast/api';

export const copySvgToClipboard = async (icon: SearchItem) => {
  // Since v6, Font Awesome stopped setting the SVGs fill color to
  // currentColor, this restores that behavior.
  const svgWithCurrentColor = icon.svgs[0].toString().replace(/<path/g, '<path fill="currentColor"');

  // Copy SVG to clipboard
  await Clipboard.copy(svgWithCurrentColor);

  // Notify the user
  await showHUD('Copied SVG to clipboard!');
};

export const copyFAGlyphToClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(String.fromCharCode(parseInt(icon.unicode, 16)));

  // Notify the user
  await showHUD('Copied Glyph to clipboard!');
};
// fa-duotone fa-computer-classic
export const copyFAClassesToClipboard = async (icon: SearchItem) => {
  // Get first style of icon, or use the default iconStyle
  const faClass = `fa-${familyStylesByPrefix[icon.svgs[0].familyStyle.prefix].split(', ')[1].toLowerCase()} fa-${
    icon.id
  }`;

  // Copy icon classes to clipboard
  await Clipboard.copy(faClass);

  // Notify the user
  await showHUD('Copied Classes to clipboard!');
};

//---
export const copyFASlugToClipboard = async (icon: SearchItem) => {
  // Copy icon name to clipboard
  await Clipboard.copy(icon.id);

  // Notify the user
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
