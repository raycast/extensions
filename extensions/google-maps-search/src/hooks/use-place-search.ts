import { useState, useCallback, useEffect } from "react";
import { getPreferenceValues, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { Preferences, PlaceSearchResult } from "../types";
import { searchPlaces } from "../utils/google-places-api";

export function usePlaceSearch(initialSearchText?: string) {
  const [searchText, setSearchText] = useState(initialSearchText || "");
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  // Check if API key is set
  useEffect(() => {
    if (!preferences.googlePlacesApiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Key Missing",
        message: "Please set your Google Places API key in preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    }
  }, []);

  // Search for places when the search text changes
  const performSearch = useCallback(async () => {
    if (!searchText.trim() || !preferences.googlePlacesApiKey) return;

    setIsLoading(true);
    try {
      const results = await searchPlaces(searchText);
      setPlaces(results);
    } catch (error) {
      console.error("Error searching places:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: "Failed to search places. Check your API key and network connection.",
      });
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchText, preferences.googlePlacesApiKey]);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchText.trim().length > 2) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [searchText, performSearch]);

  // Initial search if initialSearchText is provided
  useEffect(() => {
    if (initialSearchText && initialSearchText.trim().length > 2) {
      performSearch();
    }
  }, []);

  return {
    searchText,
    setSearchText,
    isLoading,
    places,
    hasApiKey: !!preferences.googlePlacesApiKey,
  };
}
