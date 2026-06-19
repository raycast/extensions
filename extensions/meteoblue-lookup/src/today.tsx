import {
  List,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useWeather } from "./hooks";
import { useFavorites } from "./favorites";
import { HourDetail } from "./HourDetail";
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  getWeatherIcon,
} from "./utils";

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
    // Filter for forward-looking hours: start from the current hour (rounded down)
    const now = new Date();
    const currentHourStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
    ).getTime();
    const startIndex = basicData.findIndex(
      (item) => new Date(item.time).getTime() >= currentHourStart,
    );
    const hourlyData =
      startIndex >= 0
        ? basicData.slice(startIndex, startIndex + 24)
        : basicData.slice(0, 24);

    const locationName = selectedLocation
      ? `${selectedLocation.name}, ${selectedLocation.country}`
      : "Unknown Location";

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search for a city..."
        onSearchTextChange={(text) => {
          if (text.length === 0) {
            // Clear search and reset
            setSearchText("");
            // Trigger reset via hook if needed, but hook handles state.
            // To reset fully we might need to expose a reset function or manually trigger location search
            // For now, rely on user typing to trigger new search
          }
          setSearchText(text);
        }}
        throttle
      >
        <List.Section title={`Hourly Forecast - ${locationName}`}>
          {hourlyData.length > 0 ? (
            hourlyData.map((item, index) => {
              const date = new Date(item.time);
              const timeStr = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const dateStr =
                index === 0
                  ? "Now"
                  : date.toLocaleDateString([], {
                      weekday: "short",
                    });

              return (
                <List.Item
                  key={item.time}
                  title={`${dateStr} ${timeStr}`}
                  subtitle={`${formatTemperature(item.temperature, weatherData.basic?.units?.temperature || "°C")} • ${formatPrecipitation(item.precipitation, weatherData.basic?.units?.precipitation || "mm")} • ${formatWindSpeed(item.windspeed, weatherData.basic?.units?.windspeed || "km/h")}`}
                  icon={getWeatherIcon(item.pictocode)}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Info}
                        target={
                          <HourDetail
                            item={item}
                            units={{
                              temperature:
                                weatherData.basic?.units?.temperature || "°C",
                              felttemperature:
                                weatherData.basic?.units?.felttemperature ||
                                weatherData.basic?.units?.temperature ||
                                "°C",
                              precipitation:
                                weatherData.basic?.units?.precipitation || "mm",
                              windspeed:
                                weatherData.basic?.units?.windspeed || "km/h",
                              sealevelpressure:
                                weatherData.basic?.units?.sealevelpressure ||
                                "hPa",
                            }}
                          />
                        }
                      />
                      {selectedLocation &&
                        (isLocationFavorite(selectedLocation.id) ? (
                          <Action
                            title="Remove from Favorites"
                            icon={Icon.StarDisabled}
                            onAction={() =>
                              handleRemoveFavorite(selectedLocation.id)
                            }
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
                />
              );
            })
          ) : (
            <List.Item
              title="No hourly forecast data available"
              icon={Icon.ExclamationMark}
            />
          )}
        </List.Section>
      </List>
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
