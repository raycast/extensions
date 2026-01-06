import { List, LocalStorage } from "@raycast/api";
import { getAllCountries } from "country-locale-map";
import { useEffect, useState } from "react";
import type { Country } from "./country-detail";
import { CountryItem } from "./country-item";
import { DateRange } from "./country-detail";

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
  const [dateRange, setDateRange] = useState<DateRange>("next_3_months");

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
      filtering={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Date Range"
          storeValue={true}
          defaultValue={dateRange}
          onChange={(newValue) => setDateRange(newValue as DateRange)}
        >
          <List.Dropdown.Section title="Range">
            <List.Dropdown.Item title="Next 1 month" value="next_1_month" />
            <List.Dropdown.Item title="Next 3 months" value="next_3_months" />
            <List.Dropdown.Item title="Next 6 months" value="next_6_months" />
            <List.Dropdown.Item title="This year" value="this_year" />
            <List.Dropdown.Item title="Next year" value="next_year" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
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
                dateRange={dateRange}
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
                dateRange={dateRange}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
