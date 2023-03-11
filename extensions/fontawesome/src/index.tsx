import { useEffect, useState } from 'react';
import { Action, ActionPanel, Clipboard, Color, getPreferenceValues, Grid, showHUD } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import fetch from 'node-fetch';
import { ApiResponse, Icon, IconStyle, Preferences } from './types';

const iconQuery = `
query {
  release(version: "6.2.0") {
    icons {
      id
      unicode
      label
      unicode
      familyStylesByLicense {
        free {
          style
        }
      }
    }
  },
}
`;

const getLibraryType = (icon: Icon, iconStyle: IconStyle): string => {
  if (icon.familyStylesByLicense.free.length === 0) {
    return iconStyle;
  }

  if (icon.familyStylesByLicense.free[0].style === 'brands') {
    return 'brands';
  }

  return iconStyle;
};

function prettyPrintIconStyle(iconStyle: IconStyle) {
  return {
    brands: 'Brands',
    duotone: 'Duotone',
    light: 'Light',
    regular: 'Regular',
    'sharp-solid': 'Sharp Solid',
    solid: 'Solid',
    thin: 'Thin',
  }[iconStyle];
}

export default function Command() {
  const { iconStyle } = getPreferenceValues<Preferences>();

  const getSvgUrl = (icon: Icon, iconStyle: IconStyle): string => {
    return `https://site-assets.fontawesome.com/releases/v6.2.0/svgs/${getLibraryType(icon, iconStyle)}/${icon.id}.svg`;
  };

  const { isLoading, data } = useFetch<ApiResponse>('https://api.fontawesome.com', {
    method: 'POST',
    body: iconQuery,
  });

  const [icons, setIcons] = useState<Icon[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Once the icons have been fetched,
    // set them to the icons array.
    if (data !== undefined) {
      setIcons(data.data.release.icons);
    }
  }, [data]);

  useEffect(() => {
    if (data === undefined || isLoading) {
      return;
    }

    const originalIconSet = data.data.release.icons;

    // If the query is empty, reset the icons
    if (searchQuery === '') {
      setIcons(originalIconSet);
      return;
    }

    // Filter icons based on the searchQuery
    const filteredIcons = originalIconSet.filter((icon) =>
      icon.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setIcons(filteredIcons);
  }, [searchQuery]);

  const copySvgToClipboard = async (icon: Icon, iconStyle: IconStyle) => {
    // Fetch SVG from FontAwesome site
    const response = await fetch(getSvgUrl(icon, iconStyle));
    const svg = await response.text();

    // Since v6, Font Awesome stopped setting the SVGs fill color to
    // currentColor, this restores that behavior.
    const svgWithCurrentColor = svg.toString().replace(/<path/g, '<path fill="currentColor"');

    // Copy SVG to clipboard
    await Clipboard.copy(svgWithCurrentColor);

    // Notify the user
    await showHUD('Copied SVG to clipboard!');
  };

  const copyFASlugToClipboard = async (icon: Icon) => {
    // Copy SVG to clipboard
    await Clipboard.copy(icon.id);

    // Notify the user
    await showHUD('Copied Slug to clipboard!');
  };

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Large}
      enableFiltering={false}
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      navigationTitle="Search Font Awesome"
      searchBarPlaceholder="Search icons"
    >
      {icons.map((icon) => (
        <Grid.Item
          key={icon.id}
          title={icon.label}
          content={{
            source: getSvgUrl(icon, 'regular'),
            tintColor: Color.PrimaryText,
          }}
          actions={
            <ActionPanel>
              <Action
                title={`Copy SVG (${prettyPrintIconStyle(iconStyle)})`}
                icon="copy-clipboard-16"
                onAction={() => copySvgToClipboard(icon, iconStyle)}
              />
              <Action title={`Copy FA Slug`} icon="copy-clipboard-16" onAction={() => copyFASlugToClipboard(icon)} />
              <Action.OpenInBrowser
                title="Open In Browser"
                url={`https://fontawesome.com/icons/${icon.id}?s=solid&f=classic`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
