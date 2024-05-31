import { useState, useEffect } from 'react';
import { Grid, Color, Action, ActionPanel, LocalStorage, getPreferenceValues } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { SearchResult, TokenData } from './types';
import { copyFASlugToClipboard, familyStylesByPrefix, iconForStyle } from './utils';

//GraphQL Query to fetch icons for a specific style
const iconQuery = (squery: string, stype: string) => `query Search {
  search(query:"${squery}", version: "6.5.2", first: 48) {
      id
      label
      svgs(filter: { familyStyles: [
        { family: ${stype.split(', ')[0].toUpperCase()}, style: ${stype.split(', ')[1].toUpperCase()} }
      ] }) {
          html
      }
  }
}
`;

export default function Command() {
  const [type, setType] = useState<string>('fass');
  const [query, setQuery] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenTimeStart, setTokenTimeStart] = useState<number>();

  const { API_TOKEN } = getPreferenceValues();
  useEffect(() => {
    const tokenTimerCheck = async () => {
      const timeStart = await LocalStorage.getItem<number>('token-expiry-start');
      setTokenTimeStart(timeStart);
    };

    tokenTimerCheck();
  }, []);

  // Fetch access token, store expiry info in local storage and state and store access token
  useFetch<TokenData>('https://api.fontawesome.com/token', {
    execute: !tokenTimeStart || Date.now() - tokenTimeStart >= 3600000 ? true : false,
    onData: (data) => {
      LocalStorage.setItem('token-expiry-start', Date.now());
      setAccessToken(data.access_token);
    },
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  //fetch icons
  const { isLoading, data } = useFetch<SearchResult>('https://api.fontawesome.com', {
    execute: accessToken ? true : false,
    keepPreviousData: true,
    method: 'POST',
    body: iconQuery(query, familyStylesByPrefix[type]),
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
      {data?.data.search
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
              </ActionPanel>
            }
            content={{
              source: `data:image/svg+xml;base64,${Buffer.from(searchItem.svgs[0].html).toString('base64')}`,
              tintColor: Color.PrimaryText,
              tooltip: searchItem.id,
            }}
          />
        ))}
    </Grid>
  );
}
