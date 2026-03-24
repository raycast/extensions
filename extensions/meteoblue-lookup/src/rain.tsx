import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  openExtensionPreferences,
  Color,
} from "@raycast/api";
import { useWeather } from "./hooks";
import { useFavorites } from "./favorites";

export default function Command() {
  const {
    searchText,
    setSearchText,
    isLoading,
    locationResults,
    selectedLocation,
    weatherData,
    error,
    showLocationSearch,
    handleSelectLocation,
    handleUseCurrentLocation,
    preferences,
  } = useWeather();

  const {
    favorites,
    lastUsedLocation,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSetLastUsed,
    isLocationFavorite,
  } = useFavorites();

  const selectLocation = async (
    location: import("./types").LocationSearchResult,
  ) => {
    await handleSetLastUsed(location);
    await handleSelectLocation(location);
  };

  const getRainStatus = (probability: number) => {
    if (probability <= 10)
      return {
        text: "NO",
        color: Color.Green,
        blurb: "Bone dry. Leave the umbrella.",
      };
    if (probability <= 20)
      return {
        text: "NOPE",
        color: Color.Green,
        blurb: "Probably not. Maybe a sprinkle.",
      };
    if (probability <= 30)
      return {
        text: "UNLIKELY",
        color: Color.Yellow,
        blurb: "Clouds are bluffing.",
      };
    if (probability <= 40)
      return { text: "MAYBE", color: Color.Yellow, blurb: "Flip a coin." };
    if (probability <= 50)
      return {
        text: "CHANCE",
        color: Color.Orange,
        blurb: "I wouldn't risk suede shoes.",
      };
    if (probability <= 60)
      return { text: "LIKELY", color: Color.Orange, blurb: "Pack a raincoat." };
    if (probability <= 70)
      return { text: "YES", color: Color.Red, blurb: "It's gonna rain." };
    if (probability <= 80)
      return {
        text: "DEFINITELY",
        color: Color.Red,
        blurb: "You will get wet.",
      };
    if (probability <= 90)
      return {
        text: "POURING",
        color: Color.Red,
        blurb: "Forget the hair gel.",
      };
    return {
      text: "WET",
      color: Color.Purple,
      blurb: "It's going to pour. Bring a kayak.",
    };
  };

  // Error state - API key missing
  if (
    error &&
    error.includes("API key is required") &&
    (!preferences.apikey || preferences.apikey.trim().length === 0)
  ) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="API Key Required"
          description="Please configure your meteoblue API key in extension preferences (⌘,)."
        />
      </List>
    );
  }

  // Show location search results when actively searching
  if (
    showLocationSearch &&
    searchText.length >= 2 &&
    !selectedLocation &&
    !weatherData
  ) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search for a city..."
        onSearchTextChange={setSearchText}
        throttle
      >
        {locationResults.length > 0 ? (
          <>
            <List.Section title="Search Locations">
              {locationResults.map((location) => (
                <List.Item
                  key={location.id}
                  title={location.name}
                  subtitle={`${location.country}${location.admin1 ? `, ${location.admin1}` : ""}`}
                  accessoryTitle={`${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Select Location"
                        icon={Icon.Check}
                        onAction={() => selectLocation(location)}
                      />
                      {isLocationFavorite(location.id) ? (
                        <Action
                          title="Remove from Favorites"
                          icon={Icon.StarDisabled}
                          onAction={() => handleRemoveFavorite(location.id)}
                        />
                      ) : (
                        <Action
                          title="Add to Favorites"
                          icon={Icon.Star}
                          onAction={() => handleAddFavorite(location)}
                        />
                      )}
                      <Action
                        title="Configure Extension"
                        icon={Icon.Gear}
                        shortcut={{ modifiers: ["cmd"], key: "," }}
                        onAction={openExtensionPreferences}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </>
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={isLoading ? "Searching..." : "No results found"}
            description={
              isLoading
                ? "Searching for locations..."
                : `No locations found for "${searchText}"`
            }
          />
        )}
      </List>
    );
  }

  // Show weather data
  if (weatherData) {
    const basicData = weatherData.basic?.data_1h || [];
    // Check next 12 hours for rain
    const next12Hours = basicData.slice(0, 12);

    // Calculate max precipitation probability/amount
    // Note: basic package might not have probability, so checking precipitation amount > 0

    // Check if we have probability data (predictability is close proxy or we rely on precip amount)
    // Meteoblue basic package usually gives precipitation amount, but not always probability directly in basic
    // We'll infer "chance" based on amount if probability is missing, or assume 100% if amount > 0.5mm

    let maxRainChance = 0;

    next12Hours.forEach((hour) => {
      if (hour.precipitation !== undefined && hour.precipitation > 0) {
        // Simple logic: if > 0.1mm rain, assume high chance.
        // This is a simplification since we don't have raw probability in basic package usually.
        // We will map precipitation amount to a "confidence" score for the sake of the UI blurb.
        if (hour.precipitation > 2.0)
          maxRainChance = Math.max(maxRainChance, 100);
        else if (hour.precipitation > 0.5)
          maxRainChance = Math.max(maxRainChance, 80);
        else if (hour.precipitation > 0.1)
          maxRainChance = Math.max(maxRainChance, 60);
        else maxRainChance = Math.max(maxRainChance, 30);
      }

      // If pictocode indicates rain/snow/storm
      if (
        hour.pictocode &&
        ((hour.pictocode >= 5 && hour.pictocode <= 12) || hour.pictocode >= 14)
      ) {
        maxRainChance = Math.max(maxRainChance, 70);
      }
    });

    const status = getRainStatus(maxRainChance);

    const locationName = selectedLocation
      ? `${selectedLocation.name}, ${selectedLocation.country}`
      : "Unknown Location";

    return (
      <Detail
        markdown={`# ${status.text}

${status.blurb}
`}
        actions={
          <ActionPanel>
            <Action
              title="Change Location"
              icon={Icon.MagnifyingGlass}
              onAction={() => setSearchText("")} // Hack to go back to search
            />
            {selectedLocation &&
              (isLocationFavorite(selectedLocation.id) ? (
                <Action
                  title="Remove from Favorites"
                  icon={Icon.StarDisabled}
                  onAction={() => handleRemoveFavorite(selectedLocation.id)}
                />
              ) : (
                <Action
                  title="Add to Favorites"
                  icon={Icon.Star}
                  onAction={() => handleAddFavorite(selectedLocation)}
                />
              ))}
            <Action
              title="Configure Extension"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text={status.text}
              icon={{ source: Icon.CircleFilled, tintColor: status.color }}
            />
            <Detail.Metadata.Label
              title="Rain Chance"
              text={`${maxRainChance}%`}
            />
            <Detail.Metadata.Label
              title="Total Rain (12h)"
              text={`${next12Hours.reduce((acc, curr) => acc + (curr.precipitation || 0), 0).toFixed(1)} ${weatherData.basic?.units?.precipitation || "mm"}`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Location" text={locationName} />
          </Detail.Metadata>
        }
      />
    );
  }

  // Empty state - initial load
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a city..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length === 0 && !selectedLocation ? (
        <>
          <List.Section title="Suggestions">
            {lastUsedLocation && (
              <List.Item
                title={lastUsedLocation.name}
                subtitle={`${lastUsedLocation.country}${lastUsedLocation.admin1 ? `, ${lastUsedLocation.admin1}` : ""}`}
                icon={Icon.Clock}
                accessories={[{ text: "Last used" }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select Location"
                      icon={Icon.Check}
                      onAction={() => selectLocation(lastUsedLocation)}
                    />
                    {isLocationFavorite(lastUsedLocation.id) ? (
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
                        onAction={() =>
                          handleRemoveFavorite(lastUsedLocation.id)
                        }
                      />
                    ) : (
                      <Action
                        title="Add to Favorites"
                        icon={Icon.Star}
                        onAction={() => handleAddFavorite(lastUsedLocation)}
                      />
                    )}
                  </ActionPanel>
                }
              />
            )}
            <List.Item
              title="Current Location"
              icon={Icon.Pin}
              actions={
                <ActionPanel>
                  <Action
                    title="Use Current Location"
                    icon={Icon.Pin}
                    onAction={handleUseCurrentLocation}
                  />
                  <Action
                    title="Configure Extension"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          {favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map((fav) => (
                <List.Item
                  key={fav.id}
                  title={fav.name}
                  subtitle={`${fav.country}${fav.admin1 ? `, ${fav.admin1}` : ""}`}
                  icon={Icon.Star}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Select Location"
                        icon={Icon.Check}
                        onAction={() => selectLocation(fav)}
                      />
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
                        onAction={() => handleRemoveFavorite(fav.id)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        <List.EmptyView
          icon={
            selectedLocation && isLoading ? Icon.Cloud : Icon.MagnifyingGlass
          }
          title={
            selectedLocation && isLoading
              ? `Fetching weather for ${selectedLocation.name}...`
              : "Search for Weather"
          }
          description={
            selectedLocation && isLoading
              ? "Please wait while we retrieve the latest forecast."
              : "Enter a city name to see weather forecasts"
          }
        />
      )}
    </List>
  );
}
