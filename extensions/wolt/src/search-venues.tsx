import { ActionPanel, Action, List, Grid, showToast, Toast, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { WoltClient, WoltAPIError, type SearchVenueResult } from "wolt-api";
import { getStoredLocation, type StoredLocation, CITY_SLUG_KEY } from "./utils/location";
import { MenuView } from "./components/menu-view";
import { buildVenueUrl } from "./utils/menu";

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
        const results = await client.searchVenues({
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
            message: err instanceof Error ? err.message : "Failed to search venues",
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
      searchBarPlaceholder={`Search Wolt venues${storedLocation ? ` in ${storedLocation.city.name}` : ""}...`}
      throttle
      columns={4}
      aspectRatio="16/9"
    >
      {error && (
        <Grid.EmptyView
          icon="⚠️"
          title="Error loading venues"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      )}
      {!error && searchText.length === 0 && (
        <Grid.EmptyView
          icon="🔍"
          title="Start typing to search venues"
          description={`Enter a venue name or cuisine type${storedLocation ? ` in ${storedLocation.city.name}` : ""}`}
        />
      )}
      {!error && searchText.length > 0 && data && data.length === 0 && (
        <Grid.EmptyView icon="🔍" title="No venues found" description={`No results for "${searchText}"`} />
      )}
      {data && data.length > 0 && (
        <Grid.Section title="Results" subtitle={data.length.toString()}>
          {data.map((result) => (
            <VenueListItem
              key={result.venue.id || result.venue.slug}
              venue={result}
              citySlug={storedLocation?.city.slug || ""}
              countryCode={storedLocation?.city.country_code_alpha2.toLowerCase() || ""}
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

function VenueListItem({
  venue,
  citySlug,
  countryCode,
}: {
  venue: SearchVenueResult;
  citySlug: string;
  countryCode: string;
}) {
  const venueUrl = buildVenueUrl(venue.venue.slug, citySlug, countryCode);
  const address = venue.venue.address || venue.venue.slug || "";
  const isOnline = venue.venue.online;

  const subtitleParts = [];
  if (isOnline !== undefined) {
    subtitleParts.push(isOnline ? "🟢 Online" : "🔴 Offline");
  }
  if (address) {
    subtitleParts.push(address);
  }
  const subtitle = subtitleParts.join(" • ");

  // Use image from SearchVenueResult, fallback to brand_image or icon from venue
  const venueImage = venue.image?.url || venue.venue.brand_image?.url || venue.venue.icon || "";

  return (
    <Grid.Item
      title={venue.venue.name}
      subtitle={subtitle}
      content={venueImage}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Menu"
              target={
                <MenuView
                  venueId={venue.venue.id}
                  venueName={venue.venue.name}
                  venueSlug={venue.venue.slug}
                  currency={venue.venue.currency}
                  citySlug={citySlug}
                  countryCode={countryCode}
                />
              }
            />
            <Action.OpenInBrowser title="Open in Browser" url={venueUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Venue Name"
              content={venue.venue.name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Venue URL"
              content={venueUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
