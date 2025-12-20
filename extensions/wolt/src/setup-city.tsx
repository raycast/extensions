import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { WoltClient, WoltAPIError, type City } from "wolt-api";
import { getStoredLocation } from "./utils/location";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const client = new WoltClient();

  const { data: storedLocation } = useCachedPromise(getStoredLocation, []);

  const {
    data: cities,
    isLoading,
    error,
  } = useCachedPromise(async () => {
    try {
      const citiesList = await client.listCities();
      return citiesList;
    } catch (err) {
      if (err instanceof WoltAPIError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Error",
          message: err.message,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to load cities",
        });
      }
      throw err;
    }
  }, []);

  const filteredCities = cities?.filter((city) => city.name.toLowerCase().includes(searchText.toLowerCase()));

  const handleSelectCity = async (city: City) => {
    try {
      await showToast({
        style: Toast.Style.Success,
        title: "City Slug Copied",
        message: `Copy "${city.slug}" to your preferences`,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to copy city slug",
      });
    }
  };

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search cities..." throttle>
      {error && (
        <List.EmptyView
          icon="⚠️"
          title="Error loading cities"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      )}
      {!error && searchText.length === 0 && (
        <List.EmptyView
          icon="🌍"
          title="Browse Cities"
          description={
            storedLocation
              ? `Current city: ${storedLocation.city.name} (${storedLocation.city.slug}). Select a city to copy its slug for preferences.`
              : "Select a city to copy its slug, then paste it into Extension Preferences → City Slug"
          }
        />
      )}
      {!error && searchText.length > 0 && filteredCities && filteredCities.length === 0 && (
        <List.EmptyView icon="🔍" title="No cities found" description={`No results for "${searchText}"`} />
      )}
      {filteredCities && filteredCities.length > 0 && (
        <List.Section title="Cities" subtitle={filteredCities.length.toString()}>
          {filteredCities.map((city) => (
            <CityListItem
              key={city.id}
              city={city}
              onSelect={handleSelectCity}
              isSelected={storedLocation?.city.id === city.id}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CityListItem({
  city,
  onSelect,
  isSelected,
}: {
  city: City;
  onSelect: (city: City) => void;
  isSelected?: boolean;
}) {
  return (
    <List.Item
      title={city.name}
      subtitle={`${city.country_code_alpha2} • ${city.timezone}`}
      accessories={[{ text: city.slug }, ...(isSelected ? [{ text: "✓ Selected", icon: "✅" }] : [])]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy City Slug"
              content={city.slug}
              shortcut={{ modifiers: [], key: "enter" }}
            />
            <Action
              title="Copy City Slug"
              onAction={() => onSelect(city)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
