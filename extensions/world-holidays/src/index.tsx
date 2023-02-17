import { List } from '@raycast/api';
import { useState } from 'react';
import { CountryItem } from './components/CountryItem';
import { useCountries } from './hooks/useCountries';

export default function WorldHolidays() {
  const [searchQuery, setSearchQuery] = useState('');
  const { pinnedCountries, unpinnedCountries, pinCountry, unpinCountry } =
    useCountries((country) => {
      setSearchQuery(country.name);
    });

  return (
    <List
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      isLoading={!pinnedCountries || !unpinnedCountries}
      isShowingDetail
      enableFiltering
    >
      <List.Section title={'Pinned countries'}>
        {pinnedCountries.map((country) => {
          return (
            <CountryItem
              key={country.code}
              country={country}
              onAction={() => {
                unpinCountry(country);
              }}
              pinned
            />
          );
        })}
      </List.Section>
      <List.Section
        title={pinnedCountries.length ? 'Other countries' : 'Countries'}
      >
        {unpinnedCountries.map((country) => {
          return (
            <CountryItem
              key={country.code}
              country={country}
              onAction={() => {
                pinCountry(country);
              }}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
