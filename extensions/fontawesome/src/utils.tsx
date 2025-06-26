import { SearchItem } from './types';
import { Clipboard, showHUD, ActionPanel, Action, getPreferenceValues } from '@raycast/api';

export const copySvgToClipboard = async (icon: SearchItem) => {
  // Since v6, Font Awesome stopped setting the SVGs fill color to currentColor, this restores that behavior.
  const svgWithCurrentColor = icon.svgs[0]['html'].toString().replace(/<path/g, '<path fill="currentColor"');
  await Clipboard.copy(svgWithCurrentColor);
  await showHUD('Copied SVG to clipboard!');
};

export const copyFAGlyphToClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(String.fromCharCode(parseInt(icon.unicode, 16)));
  await showHUD('Copied glyph to clipboard!');
};

export const copyFAUnicodeClipboard = async (icon: SearchItem) => {
  // Convert the unicode to a string and copy it to the clipboard
  await Clipboard.copy(icon.unicode);
  await showHUD('Copied unicode to clipboard!');
};

export const copyFAClassesToClipboard = async (icon: SearchItem) => {
  // Get first style of icon, or use the default iconStyle
  const faClass = `fa-${familyStylesByPrefix[icon.svgs[0].familyStyle.prefix].split(', ')[1].toLowerCase()} fa-${
    icon.id
  }`;
  await Clipboard.copy(faClass);
  await showHUD('Copied classes to clipboard!');
};

export const copyFASlugToClipboard = async (icon: SearchItem) => {
  await Clipboard.copy(icon.id);
  await showHUD('Copied slug to clipboard!');
};

export const familyStylesByPrefix: { [key: string]: string } = {
  fass: 'Sharp, Solid',
  fasr: 'Sharp, Regular',
  fasl: 'Sharp, Light',
  fast: 'Sharp, Thin',
  fad: 'Duotone, Solid',
  fadr: 'Duotone, Regular',
  fadl: 'Duotone, Light',
  fadt: 'Duotone, Thin',
  fas: 'Classic, Solid',
  far: 'Classic, Regular',
  fal: 'Classic, Light',
  fat: 'Classic, Thin',
  fab: 'Classic, Brands',
  fasds: 'Sharp Duotone, Solid',
  fasdr: 'Sharp Duotone, Regular',
  fasdl: 'Sharp Duotone, Light',
  fasdt: 'Sharp Duotone, Thin',
};

//these are for determining which icon to use in the family/style selection menu
export function iconForStyle(prefix: string) {
  return `${familyStylesByPrefix[prefix].replace(', ', '-').replace(' ', '-').toLowerCase()}.svg`;
}

export function iconActions(searchItem: SearchItem) {
  const { PRIMARY_ACTION } = getPreferenceValues();

  const actions = [
    {
      action: (
        <Action
          key="copyIconName"
          title={`Copy Icon Name`}
          icon="copy-clipboard-16"
          onAction={() => copyFASlugToClipboard(searchItem)}
        />
      ),
      id: 'copyIconName',
    },
    {
      action: (
        <Action
          key="copyIconClasses"
          title={`Copy Icon Classes`}
          icon="copy-clipboard-16"
          onAction={() => copyFAClassesToClipboard(searchItem)}
        />
      ),
      id: 'copyIconClasses',
    },
    {
      action: (
        <Action
          key="copyAsSvg"
          title={`Copy as SVG`}
          icon="copy-clipboard-16"
          onAction={() => copySvgToClipboard(searchItem)}
        />
      ),
      id: 'copyAsSvg',
    },
    {
      action: (
        <Action
          key="copyIconGlyph"
          title={`Copy Icon Glyph`}
          icon="copy-clipboard-16"
          onAction={() => copyFAGlyphToClipboard(searchItem)}
        />
      ),
      id: 'copyIconGlyph',
    },
    {
      action: (
        <Action
          key="copyIconUnicode"
          title={`Copy Icon Unicode`}
          icon="copy-clipboard-16"
          onAction={() => copyFAUnicodeClipboard(searchItem)}
        />
      ),
      id: 'copyIconUnicode',
    },
  ];

  const primaryActionIndex = actions.findIndex((a) => a.id === PRIMARY_ACTION);
  if (primaryActionIndex > -1) {
    const [primaryAction] = actions.splice(primaryActionIndex, 1);
    actions.unshift(primaryAction);
  }

  return <ActionPanel>{actions.map((a) => a.action)}</ActionPanel>;
}
