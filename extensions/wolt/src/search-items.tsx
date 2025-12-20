import { ActionPanel, Action, List, Grid, showToast, Toast, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { WoltClient, WoltAPIError, type ItemSearchResult } from "wolt-api";
import { getStoredLocation, type StoredLocation, CITY_SLUG_KEY } from "./utils/location";
import { MenuView } from "./components/menu-view";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const client = new WoltClient();

  // Get city slug from LocalStorage (set by browse-cities) to make it reactive
  const { data: storedCitySlug } = useCachedPromise(async () => {
    const stored = await LocalStorage.getItem(CITY_SLUG_KEY);
    return (stored as string) || "";
  }, []);

  // Make location fetching reactive to city slug changes
  // Create a wrapper that accepts slug as parameter to make it reactive
  const { data: storedLocation, isLoading: isLoadingLocation } = useCachedPromise(
    async (slug: string) => {
      // slug is used as dependency to trigger revalidation when it changes
      // getStoredLocation reads from LocalStorage/preferences internally
      void slug; // Parameter used for dependency tracking
      return getStoredLocation();
    },
    [storedCitySlug || ""],
  );

  const { data, isLoading, error } = useCachedPromise(
    async (query: string, location: StoredLocation | null | undefined) => {
      if (!query.trim()) {
        return [];
      }

      if (!location) {
        throw new Error("No location set. Please run the Setup City command first.");
      }

      try {
        const results = await client.searchItems({
          q: query,
          lat: location.latitude,
          lon: location.longitude,
        });
        return results;
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
            message: err instanceof Error ? err.message : "Failed to search items",
          });
        }
        throw err;
      }
    },
    [searchText, storedLocation ?? null],
    {
      execute: searchText.length > 0 && !!storedLocation,
    },
  );

  const isLoadingAny = isLoadingLocation || isLoading;

  if (!isLoadingLocation && !storedLocation) {
    return (
      <List>
        <List.EmptyView
          icon="⚙️"
          title="Setup Required"
          description="Please select your city using the 'Set City' command or set it in Extension Preferences (⌘,)"
        />
      </List>
    );
  }

  return (
    <Grid
      isLoading={isLoadingAny}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search Wolt items${storedLocation ? ` in ${storedLocation.city.name}` : ""}...`}
      throttle
      columns={4}
      aspectRatio="16/9"
    >
      {error && (
        <Grid.EmptyView
          icon="⚠️"
          title="Error loading items"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      )}
      {!error && searchText.length === 0 && (
        <Grid.EmptyView
          icon="🔍"
          title="Start typing to search items"
          description={`Enter an item name${storedLocation ? ` in ${storedLocation.city.name}` : ""}`}
        />
      )}
      {!error && searchText.length > 0 && data && data.length === 0 && (
        <Grid.EmptyView icon="🔍" title="No items found" description={`No results for "${searchText}"`} />
      )}
      {data && data.length > 0 && (
        <Grid.Section title="Results" subtitle={data.length.toString()}>
          {data.map((result) => (
            <ItemListItem
              key={`${result.venue_id}-${result.id}`}
              item={result}
              citySlug={storedLocation?.city.slug || ""}
              countryCode={storedLocation?.city.country_code_alpha2.toLowerCase() || ""}
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

function ItemListItem({
  item,
  citySlug,
  countryCode,
}: {
  item: ItemSearchResult;
  citySlug: string;
  countryCode: string;
}) {
  const price = item.price / 100;
  const priceFormatted = item.currency ? `${price.toFixed(2)} ${item.currency}` : `${price.toFixed(2)}`;

  const subtitleParts = [];
  if (!item.is_available) {
    subtitleParts.push("Unavailable");
  }
  if (item.show_wolt_plus) {
    subtitleParts.push("Wolt+");
  }
  subtitleParts.push(priceFormatted);
  subtitleParts.push(item.venue_name);
  const subtitle = subtitleParts.join(" • ");

  const itemImage = item.image?.url || "";

  return (
    <Grid.Item
      title={item.name}
      subtitle={subtitle}
      content={itemImage}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Menu"
              target={
                <MenuView
                  venueId={item.venue_id}
                  venueName={item.venue_name}
                  venueSlug={item.venue_id} // Use venue_id as fallback for slug
                  currency={item.currency}
                  citySlug={citySlug}
                  countryCode={countryCode}
                  highlightItemId={item.id}
                />
              }
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://wolt.com/en/${countryCode}/${citySlug}/venue/${item.venue_id}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Item Name"
              content={item.name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Venue Name"
              content={item.venue_name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
