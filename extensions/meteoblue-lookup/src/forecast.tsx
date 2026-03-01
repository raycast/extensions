import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { useWeather } from "./hooks";
import {
  formatTemperature,
  formatTemperatureRange,
  formatWindSpeedDisplay,
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
                        onAction={() => handleSelectLocation(location)}
                      />
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
    const dailyData =
      weatherData.basicDay?.data_day || weatherData.basic?.data_day || [];
    // 5-day forecast
    const forecastData = dailyData.slice(0, 5);

    const locationName = selectedLocation
      ? `${selectedLocation.name}, ${selectedLocation.country}`
      : "Unknown Location";

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search for a city..."
        onSearchTextChange={(text) => {
          if (text.length === 0) {
            setSearchText("");
          }
          setSearchText(text);
        }}
        throttle
      >
        <List.Section title={`5-Day Forecast - ${locationName}`}>
          {forecastData.length > 0 ? (
            forecastData.map((item) => {
              const date = new Date(item.time);
              const dateStr = date.toLocaleDateString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
              });

              const tempUnit =
                weatherData.basicDay?.units?.temperature ||
                weatherData.basic?.units?.temperature ||
                "°C";
              const precipUnit =
                weatherData.basicDay?.units?.precipitation ||
                weatherData.basic?.units?.precipitation ||
                "mm";
              const windUnit =
                weatherData.basicDay?.units?.windspeed ||
                weatherData.basic?.units?.windspeed ||
                "km/h";

              return (
                <List.Item
                  key={item.time}
                  title={dateStr}
                  subtitle={`${formatTemperatureRange(item.temperature, item.temperature_min, item.temperature_max, tempUnit)} • ${formatPrecipitation(item.precipitation, precipUnit)} • ${formatWindSpeedDisplay(item.windspeed, item.windspeed_max, item.windspeed_mean, windUnit)}`}
                  icon={getWeatherIcon(item.pictocode)}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Info}
                        target={
                          <Detail
                            markdown={`# Daily Forecast\n\n**Date:** ${date.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n**Temperature:** ${formatTemperatureRange(item.temperature, item.temperature_min, item.temperature_max, tempUnit)}\n**Feels Like:** ${formatTemperature(item.felttemperature, weatherData.basicDay?.units?.felttemperature || weatherData.basic?.units?.felttemperature || tempUnit)}\n**Precipitation:** ${formatPrecipitation(item.precipitation, precipUnit)}\n**Wind Speed:** ${formatWindSpeedDisplay(item.windspeed, item.windspeed_max, item.windspeed_mean, windUnit)}\n**Wind Direction:** ${item.winddirection !== undefined ? `${Math.round(item.winddirection)}°` : "N/A"}\n**Humidity:** ${item.relativehumidity ? `${Math.round(item.relativehumidity)}%` : "N/A"}\n**Pressure:** ${item.sealevelpressure ? `${Math.round(item.sealevelpressure)} ${weatherData.basicDay?.units?.sealevelpressure || weatherData.basic?.units?.sealevelpressure || "hPa"}` : "N/A"}\n**UV Index:** ${item.uvindex !== undefined ? Math.round(item.uvindex).toString() : "N/A"}\n**Predictability:** ${item.predictability !== undefined ? `${Math.round(item.predictability)}%` : "N/A"}`}
                          />
                        }
                      />
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
              title="No daily forecast data available"
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
        <List.Section title="Suggestions">
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
