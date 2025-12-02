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
  formatWindSpeed,
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
    setSelectedLocation,
    weatherData,
    setWeatherData,
    error,
    showLocationSearch,
    setShowLocationSearch,
    handleSelectLocation,
    handleUseCurrentLocation,
    fetchWeatherData,
    preferences,
    setLocationResults,
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
    const basicData = weatherData.basic?.data_1h || [];
    const dailyData =
      weatherData.basicDay?.data_day || weatherData.basic?.data_day || [];
    const currentData = basicData[0]; // First item is current/next hour
    const locationName = selectedLocation
      ? `${selectedLocation.name}, ${selectedLocation.country}`
      : "Unknown Location";

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search for a city..."
        onSearchTextChange={(text) => {
          // Only clear weather data if user is actively searching for a different location
          // Don't clear if they're just viewing the current location's weather
          if (
            text.length >= 2 &&
            text.toLowerCase() !== selectedLocation?.name.toLowerCase()
          ) {
            setSearchText(text);
            setShowLocationSearch(true);
            setWeatherData(null);
            setSelectedLocation(null);
          } else if (text.length === 0) {
            // Reset to initial search state when search is cleared
            setSearchText(text);
            setShowLocationSearch(true);
            setWeatherData(null);
            setSelectedLocation(null);
            setLocationResults([]);
          } else {
            setSearchText(text);
          }
        }}
        throttle
      >
        <List.Section title="Current Conditions">
          <List.Item
            title={locationName}
            subtitle={
              currentData
                ? `${formatTemperature(currentData.temperature, weatherData.basic?.units?.temperature || "°C")}`
                : "Loading..."
            }
            icon={
              currentData ? getWeatherIcon(currentData.pictocode) : Icon.Cloud
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    if (selectedLocation) {
                      fetchWeatherData(
                        selectedLocation.latitude,
                        selectedLocation.longitude,
                        selectedLocation.elevation,
                      );
                    }
                  }}
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

        <List.Section title="Current Details">
          {currentData ? (
            <>
              <List.Item
                title="Temperature"
                subtitle={formatTemperature(
                  currentData.temperature,
                  weatherData.basic?.units?.temperature || "°C",
                )}
                icon={Icon.Temperature}
              />
              <List.Item
                title="Feels Like"
                subtitle={formatTemperature(
                  currentData.felttemperature,
                  weatherData.basic?.units?.felttemperature ||
                    weatherData.basic?.units?.temperature ||
                    "°C",
                )}
                icon={Icon.Temperature}
              />
              <List.Item
                title="Wind Speed"
                subtitle={formatWindSpeed(
                  currentData.windspeed,
                  weatherData.basic?.units?.windspeed || "km/h",
                )}
                icon={Icon.Gauge}
              />
              <List.Item
                title="Wind Direction"
                subtitle={
                  currentData.winddirection
                    ? `${Math.round(currentData.winddirection)}°`
                    : "N/A"
                }
                icon={Icon.ArrowRight}
              />
              <List.Item
                title="Relative Humidity"
                subtitle={
                  currentData.relativehumidity
                    ? `${Math.round(currentData.relativehumidity)}%`
                    : "N/A"
                }
                icon={Icon.Humidity}
              />
              {currentData.sealevelpressure && (
                <List.Item
                  title="Pressure"
                  subtitle={`${Math.round(currentData.sealevelpressure)} ${weatherData.basic?.units?.sealevelpressure || "hPa"}`}
                  icon={Icon.Gauge}
                />
              )}
              {currentData.uvindex !== undefined && (
                <List.Item
                  title="UV Index"
                  subtitle={Math.round(currentData.uvindex).toString()}
                  icon={Icon.Sun}
                />
              )}
              {currentData.predictability !== undefined && (
                <List.Item
                  title="Predictability"
                  subtitle={`${Math.round(currentData.predictability)}%`}
                  icon={Icon.CheckCircle}
                />
              )}
            </>
          ) : (
            <List.Item
              title="No current data available"
              icon={Icon.ExclamationMark}
            />
          )}
        </List.Section>

        <List.Section
          title="Hourly Forecast"
          subtitle={
            basicData.length > 0 ? `${basicData.length} hours` : "No data"
          }
        >
          {basicData.length > 0 ? (
            basicData.slice(0, 24).map((item, index) => {
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
                      hour: "2-digit",
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
                          <Detail
                            markdown={`# Weather Details\n\n**Time:** ${new Date(item.time).toLocaleString()}\n\n**Temperature:** ${formatTemperature(item.temperature, weatherData.basic?.units?.temperature || "°C")}\n**Feels Like:** ${formatTemperature(item.felttemperature, weatherData.basic?.units?.felttemperature || weatherData.basic?.units?.temperature || "°C")}\n**Precipitation:** ${formatPrecipitation(item.precipitation, weatherData.basic?.units?.precipitation || "mm")}\n**Wind Speed:** ${formatWindSpeed(item.windspeed, weatherData.basic?.units?.windspeed || "km/h")}\n**Wind Direction:** ${item.winddirection !== undefined ? `${Math.round(item.winddirection)}°` : "N/A"}\n**Humidity:** ${item.relativehumidity ? `${Math.round(item.relativehumidity)}%` : "N/A"}\n**Pressure:** ${item.sealevelpressure ? `${Math.round(item.sealevelpressure)} ${weatherData.basic?.units?.sealevelpressure || "hPa"}` : "N/A"}\n**UV Index:** ${item.uvindex !== undefined ? Math.round(item.uvindex).toString() : "N/A"}\n**Predictability:** ${item.predictability !== undefined ? `${Math.round(item.predictability)}%` : "N/A"}`}
                          />
                        }
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

        <List.Section
          title="7-Day Forecast"
          subtitle={
            dailyData.length > 0 ? `${dailyData.length} days` : "No data"
          }
        >
          {dailyData.length > 0 ? (
            dailyData.slice(0, 7).map((item) => {
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
