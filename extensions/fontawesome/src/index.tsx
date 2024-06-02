import { useState, useEffect } from 'react';
import { Grid, Color, Action, ActionPanel, LocalStorage, getPreferenceValues } from '@raycast/api';
import { useCachedState, useFetch } from '@raycast/utils';
import { SearchResult, TokenData } from './types';
import {
  copyFAClassesToClipboard,
  copyFAGlyphToClipboard,
  copyFASlugToClipboard,
  copySvgToClipboard,
  copyFAUnicodeClipboard,
  familyStylesByPrefix,
  iconForStyle,
} from './utils';

//GraphQL Query to fetch icons for a specific style
const iconQuery = (squery: string, stype: string) => `query Search {
  search(query:"${squery}", version: "6.5.2", first: 48) {
      id
      unicode
      svgs(filter: { familyStyles: [
        { family: ${stype.split(', ')[0].toUpperCase()}, style: ${stype.split(', ')[1].toUpperCase()} }
      ] }) {
          html
          familyStyle{
            prefix
          }
      }
  }
}
`;

export default function Command() {
  const [type, setType] = useState<string>('fass');
  const [query, setQuery] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenTimeStart, setTokenTimeStart] = useState<number>();
  const [iconData, setIconData] = useCachedState<SearchResult>('iconData');

  let { API_TOKEN } = getPreferenceValues();

  //if pro API Token not provided, use free API Token
  if (!API_TOKEN) {
    API_TOKEN = 'D7A31EA9-20D8-434E-A6C6-8ADC890ADCB8';
  }

  useEffect(() => {
    const tokenTimerCheck = async () => {
      const timeStart = await LocalStorage.getItem<number>('token-expiry-start');
      setTokenTimeStart(timeStart);
    };

    tokenTimerCheck();
  }, []);

  // Fetch access token, store expiry info in local storage and state and store access token
  useFetch<TokenData>('https://api.fontawesome.com/token', {
    execute: !tokenTimeStart || Date.now() - (tokenTimeStart || 0) >= 3600000 ? true : false,
    onData: (data) => {
      LocalStorage.setItem('token-expiry-start', Date.now());
      setAccessToken(data.access_token);
    },
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  const { isLoading, data } = useFetch<SearchResult>('https://api.fontawesome.com', {
    execute: accessToken ? true : false,
    keepPreviousData: true,
    method: 'POST',
    body: iconQuery(query, familyStylesByPrefix[type]),
    onData: (data) => {
      setIconData(data);
    },
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (
    <Grid
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      inset={Grid.Inset.Large}
      columns={8}
      throttle={true}
      searchBarPlaceholder="Search icons..."
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Family & Style" onChange={(newValue) => setType(newValue)}>
          <Grid.Dropdown.Section title="Sharp Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(0, 4)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Duotone Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(4, 5)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Classic Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(5, 10)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {(iconData || data)?.data.search
        .filter((searchItem) => searchItem.svgs.length != 0)
        .map((searchItem) => (
          <Grid.Item
            title={searchItem.id}
            key={searchItem.id}
            actions={
              <ActionPanel>
                <Action
                  title={`Copy Icon Slug`}
                  icon="copy-clipboard-16"
                  onAction={() => copyFASlugToClipboard(searchItem)}
                />
                <Action
                  title={`Copy Icon Classes`}
                  icon="copy-clipboard-16"
                  onAction={() => copyFAClassesToClipboard(searchItem)}
                />
                <Action
                  title={`Copy as SVG`}
                  icon="copy-clipboard-16"
                  onAction={() => copySvgToClipboard(searchItem)}
                />
                <Action
                  title={`Copy Icon Glyph`}
                  icon="copy-clipboard-16"
                  onAction={() => copyFAGlyphToClipboard(searchItem)}
                />
                <Action
                  title={`Copy Icon Unicode`}
                  icon="copy-clipboard-16"
                  onAction={() => copyFAUnicodeClipboard(searchItem)}
                />
              </ActionPanel>
            }
            content={{
              value: {
                source: `data:image/svg+xml;base64,${Buffer.from(searchItem.svgs[0].html).toString('base64')}`,
                tintColor: Color.PrimaryText,
              },
              tooltip: searchItem.id,
            }}
          />
        ))}
    </Grid>
  );
}
