import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import fetch from "node-fetch";

// Define what information we want to store about each country
interface Country {
  name: {
    common: string; // The everyday name of the country
    official: string; // The official, formal name of the country
  };
  cca3: string; // The 3-letter country code (e.g., USA for United States)
  flags: {
    png: string; // Web address for the country's flag image (PNG format)
    svg: string; // Web address for the country's flag image (SVG format)
  };
  capital?: string[]; // The capital city (or cities) of the country
  region: string; // The world region where the country is located
  population: number; // The population of the country
}

// The main function that sets up our country lookup tool
export default function Command() {
  // Set up containers to store our data and track the state of our app
  const [countries, setCountries] = useState<Country[]>([]); // Store the list of countries
  const [isLoading, setIsLoading] = useState(true); // Track if we're still loading data
  const [searchText, setSearchText] = useState(""); // Store what the user types in the search bar

  // This effect runs once when the component loads
  useEffect(() => {
    // function to fetch country data from the internet
    async function fetchCountries() {
      try {
        // Fetch country data from an the restcountries API
        const response = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,cca3,flags,capital,region,population",
        );
        if (!response.ok) {
          throw new Error("Failed to fetch countries");
        }
        const data: Country[] = await response.json();
        // Sort countries alphabetically by common name
        const sortedData = data.sort((a, b) =>
          a.name.common.localeCompare(b.name.common),
        );
        setCountries(sortedData); // Store the sorted country data
        setIsLoading(false); // Mark that we're done loading
      } catch (error) {
        console.error("Error fetching countries:", error);
        // Show an error message if something goes wrong
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch countries",
          message: "Please check your internet connection and try again.",
        });
        setIsLoading(false); // Mark that we're done loading, even though it failed
      }
    }
    fetchCountries(); // Call the function to fetch countries
  }, []);

  // Filter the countries based on what the user has typed in the search bar
  const filteredCountries = countries.filter(
    (country) =>
      country.name.common.toLowerCase().includes(searchText.toLowerCase()) ||
      country.cca3.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Return the user interface for the country lookup tool
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
              <Action.CopyToClipboard
                title="Copy ISO Code"
                content={country.cca3}
              />
              <Action.CopyToClipboard
                title="Copy Country Name"
                content={country.name.common}
              />
              <Action.OpenInBrowser
                title="View Flag"
                url={country.flags.svg}
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
