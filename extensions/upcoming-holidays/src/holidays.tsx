import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { getAllCountries } from "country-locale-map";
import { useEffect, useState } from "react";
import { CountryDetail } from "./country";
import type { Country } from "./country";

type Values = {
  [countryCode: string]: boolean;
};

const getPinnedCountries = async () => {
  const countries = await LocalStorage.allItems<Values>();
  return Object.keys(countries);
};

export default function Command() {
  const countries = getAllCountries();
  const [pinnedCountries, setPinnedCountries] = useState<Country[]>();
  const [unpinnedCountries, setUnpinnedCountries] = useState<Country[]>();
  const [searchText, setSearchText] = useState("");

  const loadCountries = async () => {
    const pinnedCountriesCodes = await getPinnedCountries();
    setPinnedCountries(countries.filter((country) => pinnedCountriesCodes.includes(country.alpha2)));
    setUnpinnedCountries(countries.filter((country) => !pinnedCountriesCodes.includes(country.alpha2)));
  };

  const pinCountry = async (country: Country) => {
    await LocalStorage.setItem(country.alpha2, true);
    loadCountries();
    setSearchText(country.name);
  };

  const unpinCountry = async (country: Country) => {
    await LocalStorage.removeItem(country.alpha2);
    loadCountries();
  };

  useEffect(() => {
    (async () => {
      await loadCountries();
    })();
  }, []);

  return (
    <List
      isLoading={!pinnedCountries || !unpinnedCountries}
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      enableFiltering={true}
    >
      <List.Section title="Pinned countries">
        {pinnedCountries &&
          pinnedCountries.map((country) => {
            const props: Partial<List.Item.Props> = {
              detail: <CountryDetail countryCode={country.alpha2} />,
            };
            return (
              <List.Item
                key={country.alpha2}
                title={country.name}
                icon={country.emoji}
                {...props}
                actions={
                  <ActionPanel>
                    <Action title="Unpin country" onAction={() => unpinCountry(country)} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
      <List.Section title="Unpinned countries">
        {unpinnedCountries &&
          unpinnedCountries.map((country) => {
            const props: Partial<List.Item.Props> = {
              detail: <CountryDetail countryCode={country.alpha2} />,
            };
            return (
              <List.Item
                key={country.alpha2}
                title={country.name}
                icon={country.emoji}
                {...props}
                actions={
                  <ActionPanel>
                    <Action title="Pin country" onAction={() => pinCountry(country)} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
