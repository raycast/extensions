import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { WoltClient, WoltAPIError, type City } from "wolt-api";
import { getStoredLocation, setCitySlug } from "./utils/location";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const client = new WoltClient();

  const { data: storedLocation, revalidate: revalidateLocation } = useCachedPromise(getStoredLocation, []);

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
          title="Set Your City"
          description={
            storedLocation
              ? `Current city: ${storedLocation.city.name}. Select a city below to change it.`
              : "Select a city to set it as your default location for Wolt searches."
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
              isSelected={storedLocation?.city.id === city.id}
              onSelect={async () => {
                await setCitySlug(city.slug);
                await showToast({
                  style: Toast.Style.Success,
                  title: "City Set",
                  message: `${city.name} has been set as your default city`,
                });
                revalidateLocation();
              }}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CityListItem({
  city,
  isSelected,
  onSelect,
}: {
  city: City;
  isSelected?: boolean;
  onSelect: () => Promise<void>;
}) {
  return (
    <List.Item
      title={city.name}
      subtitle={`${city.country_code_alpha2} • ${city.timezone}`}
      accessories={[{ text: city.slug }, ...(isSelected ? [{ text: "✓ Current", icon: "✅" }] : [])]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={isSelected ? "Already Selected" : "Set as Default City"} onAction={onSelect} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy City Slug"
              content={city.slug}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
