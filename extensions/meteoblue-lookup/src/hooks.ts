import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { searchLocation, getWeatherForecast, getCurrentLocation } from "./api";
import { LocationSearchResult, WeatherForecastResponse } from "./types";

interface Preferences {
  apikey: string;
  temperatureUnit: string;
  windspeedUnit: string;
  precipitationUnit: string;
}

export function useWeather() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [locationResults, setLocationResults] = useState<
    LocationSearchResult[]
  >([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSearchResult | null>(null);
  const [weatherData, setWeatherData] =
    useState<WeatherForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(true);

  const handleLocationSearch = useCallback(
    async (query: string) => {
      if (!preferences.apikey) {
        setError(
          "API key is required. Please configure it in extension preferences.",
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const results = await searchLocation(query, preferences.apikey);
        setLocationResults(results);
        setShowLocationSearch(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search location";
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [preferences.apikey],
  );

  useEffect(() => {
    if (searchText.length >= 2 && preferences.apikey) {
      const timeoutId = setTimeout(() => {
        handleLocationSearch(searchText);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setLocationResults([]);
      setShowLocationSearch(true);
    }
  }, [searchText, preferences.apikey, handleLocationSearch]);

  const fetchWeatherData = async (
    lat: number,
    lon: number,
    elevation?: number,
  ) => {
    if (!preferences.apikey) {
      setError(
        "API key is required. Please configure it in extension preferences.",
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching weather...",
      });

      const units = {
        temperature: preferences.temperatureUnit,
        windspeed: preferences.windspeedUnit,
        precipitation: preferences.precipitationUnit,
      };

      const data = await getWeatherForecast(
        lat,
        lon,
        preferences.apikey,
        units,
        elevation,
      );
      setWeatherData(data);

      const hasHourlyData =
        data.basic?.data_1h && data.basic.data_1h.length > 0;
      const hasDailyData =
        data.basicDay?.data_day && data.basicDay.data_day.length > 0;

      if (!hasHourlyData && !hasDailyData) {
        showToast({
          style: Toast.Style.Failure,
          title: "No data received",
          message: "API returned empty response. Check console for details.",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Weather updated",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch weather data";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Weather Fetch Failed",
        message: errorMessage,
      });
      setWeatherData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLocation = async (location: LocationSearchResult) => {
    setSelectedLocation(location);
    setShowLocationSearch(false);
    await fetchWeatherData(
      location.latitude,
      location.longitude,
      location.elevation,
    );
  };

  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Detecting location...",
      });
      const location = await getCurrentLocation();
      await handleSelectLocation(location);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get location";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Location Failed",
        message: errorMessage,
      });
      setIsLoading(false);
    }
  };

  return {
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
    handleLocationSearch,
    handleSelectLocation,
    handleUseCurrentLocation,
    fetchWeatherData,
    preferences,
    setLocationResults,
  };
}
