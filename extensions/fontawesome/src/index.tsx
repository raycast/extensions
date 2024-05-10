import { useEffect, useState } from 'react';
import { Action, ActionPanel, Color, Grid } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { ApiResponse, Icon } from './types';
import {
  copyFAClassesToClipboard,
  copySvgToClipboard,
  copyFAGlyphToClipboard,
  copyFASlugToClipboard,
  getSvgUrl,
  prettyPrintIconStyle,
  iconStyle,
} from './utils';

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

  return (
    <Grid
      columns={8}
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
              <Action title={`Copy FA Glyph`} icon="copy-clipboard-16" onAction={() => copyFAGlyphToClipboard(icon)} />
              <Action
                title={`Copy FA Class`}
                icon="copy-clipboard-16"
                onAction={() => copyFAClassesToClipboard(icon)}
              />
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
