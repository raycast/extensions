import { useState, useEffect } from 'react';
import { Grid, Color, LocalStorage, getPreferenceValues } from '@raycast/api';
import { useCachedState, useFetch } from '@raycast/utils';
import { SearchResult, TokenData } from './types';
import { familyStylesByPrefix, iconForStyle, iconActions } from './utils';

//GraphQL Query to fetch icons for a specific style
const iconQuery = (squery: string, stype: string) => `query Search {
  search(query:"${squery}", version: "6.7.2", first: 48) {
      id
      unicode
      svgs(filter: { familyStyles: [
        { family: ${
          stype.split(' ').length === 3
            ? stype.split(', ')[0].replace(' ', '_').toUpperCase()
            : stype.split(', ')[0].toUpperCase()
        }, style: ${stype.split(', ')[1].toUpperCase()} }
        { family: CLASSIC, style: BRANDS }
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
  let { API_TOKEN, STYLE_PREFERENCE } = getPreferenceValues();
  let account = 'pro';

  //if pro API Token not provided, use free API Token
  if (!API_TOKEN) {
    API_TOKEN = 'D7A31EA9-20D8-434E-A6C6-8ADC890ADCB8';
    account = 'free';
    STYLE_PREFERENCE = 'fas';
  }

  const [type, setType] = useState<string>(STYLE_PREFERENCE);
  const [query, setQuery] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenTimeStart, setTokenTimeStart] = useState<number>();
  const [iconData, setIconData] = useCachedState<SearchResult>('iconData');

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

  // Fetch icons for a specific family and style based on query
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
        <Grid.Dropdown
          tooltip="Select Family & Style"
          onChange={(newValue) => setType(newValue)}
          defaultValue={STYLE_PREFERENCE}
        >
          {account === 'pro' ? (
            <>
              <Grid.Dropdown.Section title="Classic Icons">
                {Object.entries(familyStylesByPrefix)
                  .slice(8, 13)
                  .map(([key, value]) => (
                    <Grid.Dropdown.Item
                      key={key}
                      title={value}
                      value={key}
                      icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                    />
                  ))}
              </Grid.Dropdown.Section>
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
                  .slice(4, 8)
                  .map(([key, value]) => (
                    <Grid.Dropdown.Item
                      key={key}
                      title={value}
                      value={key}
                      icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                    />
                  ))}
              </Grid.Dropdown.Section>
              <Grid.Dropdown.Section title="Sharp Duotone Icons">
                {Object.entries(familyStylesByPrefix)
                  .slice(13, 17)
                  .map(([key, value]) => (
                    <Grid.Dropdown.Item
                      key={key}
                      title={value}
                      value={key}
                      icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                    />
                  ))}
              </Grid.Dropdown.Section>
            </>
          ) : (
            <>
              <Grid.Dropdown.Item
                key="fas"
                title="Classic, Solid"
                value="fas"
                icon={{ source: iconForStyle('fas'), tintColor: Color.SecondaryText }}
              />
              <Grid.Dropdown.Item
                key="fab"
                title="Classic, Brands"
                value="fab"
                icon={{ source: iconForStyle('fab'), tintColor: Color.SecondaryText }}
              />
            </>
          )}
        </Grid.Dropdown>
      }
    >
      {(iconData || data)?.data.search
        .filter((searchItem) => searchItem.svgs.length != 0)
        .map((searchItem) => (
          <Grid.Item
            title={searchItem.id}
            key={searchItem.id}
            actions={iconActions(searchItem)}
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
