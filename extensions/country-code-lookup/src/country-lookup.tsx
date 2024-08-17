import { useEffect, useState } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import fetch from "node-fetch";

interface Country {
  name: {
    common: string;
    official: string;
  };
  cca3: string;
  flags: {
    png: string;
    svg: string;
  };
  capital?: string[];
  region: string;
  population: number;
}

export default function Command() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function fetchCountries() {
      try {
        const response = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,cca3,flags,capital,region,population",
        );
        if (!response.ok) {
          throw new Error("Failed to fetch countries");
        }
        const data: Country[] = await response.json();
        // Sort countries alphabetically by common name
        const sortedData = data.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sortedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching countries:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch countries",
          message: "Please check your internet connection and try again.",
        });
        setIsLoading(false);
      }
    }

    fetchCountries();
  }, []);

  const filteredCountries = countries.filter(
    (country) =>
      country.name.common.toLowerCase().includes(searchText.toLowerCase()) ||
      country.cca3.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a country or ISO code..."
      throttle
    >
      {filteredCountries.map((country) => (
        <List.Item
          key={country.cca3}
          title={country.name.common}
          subtitle={country.cca3}
          accessories={[
            { text: country.capital ? country.capital[0] : "N/A" },
            { text: country.region },
            { text: country.population.toLocaleString() },
          ]}
          icon={country.flags.png}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy ISO Code" content={country.cca3} />
              <Action.CopyToClipboard title="Copy Country Name" content={country.name.common} />
              <Action.OpenInBrowser title="View Flag" url={country.flags.svg} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
