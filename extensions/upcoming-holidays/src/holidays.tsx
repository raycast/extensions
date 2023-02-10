import { List, LocalStorage } from "@raycast/api";
import { getAllCountries } from "country-locale-map";
import { useEffect, useState } from "react";
import type { Country } from "./country-detail";
import { CountryItem } from "./country-item";

type Values = {
  [countryCode: string]: boolean;
};

const getPinnedCountries = async () => {
  const countries = await LocalStorage.allItems<Values>();
  return Object.keys(countries);
};

export default function Holidays() {
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
      <List.Section title="Pinned Countries">
        {pinnedCountries &&
          pinnedCountries.map((country) => {
            return (
              <CountryItem
                key={country.alpha2}
                country={country}
                action={{
                  title: "Unpin Country",
                  handler: () => unpinCountry(country),
                }}
              />
            );
          })}
      </List.Section>
      <List.Section title="Unpinned Countries">
        {unpinnedCountries &&
          unpinnedCountries.map((country) => {
            return (
              <CountryItem
                key={country.alpha2}
                country={country}
                action={{
                  title: "Pin Country",
                  handler: () => pinCountry(country),
                }}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
