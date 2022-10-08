import { Action, ActionPanel, Grid, showHUD, Clipboard } from '@raycast/api';
import { useEffect, useState } from 'react';
import { useFetch } from '@raycast/utils';
import fetch from 'node-fetch';
import { Icon, ApiResponse } from './types';

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

const getLibraryType = (icon: Icon): string => {
  if (icon.familyStylesByLicense.free.length === 0) {
    return 'solid';
  }

  if (icon.familyStylesByLicense.free[0].style === 'brands') {
    return 'brands';
  }

  return 'solid';
};

const getSvgUrl = (icon: Icon): string => {
  return `https://site-assets.fontawesome.com/releases/v6.2.0/svgs/${getLibraryType(icon)}/${icon.id}.svg`;
};

export default function Command() {
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
    if (data === undefined || icons.length === 0) {
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

  const copySvgToClipboard = async (icon: Icon) => {
    // Fetch SVG from FontAwesome site
    const response = await fetch(getSvgUrl(icon));
    const svg = await response.text();

    // Copy SVG to clipboard
    await Clipboard.copy(svg);

    // Notify the user
    await showHUD('Copied SVG to clipboard!');
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
          content={getSvgUrl(icon)}
          actions={
            <ActionPanel>
              <Action title="Copy SVG" onAction={() => copySvgToClipboard(icon)} />
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
