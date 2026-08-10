import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "./constants";
import { extractCountryCode, formatCountryWithFlag, getCountryNameFromCode } from "./utils/helpers";
import { cachedFetch } from "./utils/cache";
import CountryAppearancesView from "./views/country-appearances-view";

interface Entry {
  country: string;
  countryCode?: string;
}

interface CountryAppearance {
  countryCode?: string;
  countryName: string;
  appearances: number;
}

export default function ExploreCountries() {
  const [countries, setCountries] = useState<CountryAppearance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchCountries() {
      try {
        const yearsResponse = await cachedFetch(`${BASE_API_URL}/senior/contests/years`);
        const years = (await yearsResponse.json()) as number[];

        const allContestants = await Promise.all(
          years.map(async (year) => {
            try {
              const response = await cachedFetch(`${BASE_API_URL}/senior/contests/${year}`);
              const data = (await response.json()) as { contestants?: Entry[] };
              return data.contestants || [];
            } catch (error) {
              showFailureToast(error, { title: `Failed to fetch contestants for year ${year}` });
              return [];
            }
          }),
        );

        const countryMap = new Map<string, { countryCode?: string; appearances: number }>();

        allContestants.flat().forEach((entry) => {
          const countryCode = extractCountryCode(entry);
          if (!countryCode) return;

          const key = countryCode.toUpperCase();
          const existing = countryMap.get(key);
          if (existing) {
            existing.appearances++;
          } else {
            countryMap.set(key, { countryCode, appearances: 1 });
          }
        });

        const countriesData: CountryAppearance[] = Array.from(countryMap.values())
          .map((data) => ({
            countryCode: data.countryCode,
            countryName: getCountryNameFromCode(data.countryCode),
            appearances: data.appearances,
          }))
          .sort((a, b) => a.countryName.localeCompare(b.countryName));

        setCountries(countriesData);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCountries();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search countries...">
      {countries.map((country) => (
        <List.Item
          key={country.countryCode || country.countryName}
          title={formatCountryWithFlag(country.countryCode, country.countryName)}
          accessories={[{ text: `${country.appearances} ${country.appearances === 1 ? "appearance" : "appearances"}` }]}
          actions={
            <ActionPanel>
              <Action
                title={`View ${country.countryName} Appearances`}
                icon={Icon.List}
                onAction={() =>
                  push(<CountryAppearancesView countryCode={country.countryCode} countryName={country.countryName} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
