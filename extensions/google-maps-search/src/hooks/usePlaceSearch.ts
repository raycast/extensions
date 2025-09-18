import { useState, useCallback, useEffect } from "react";
import { getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { Preferences, PlaceSearchResult } from "../types";
import { searchPlaces } from "../utils/googlePlacesApi";
import { showFailureToast } from "@raycast/utils";

// Constants
const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_DELAY_MS = 500;

export function usePlaceSearch(initialSearchText?: string) {
  const [searchText, setSearchText] = useState(initialSearchText || "");
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  // Check if API key is set
  useEffect(() => {
    if (!preferences.googlePlacesApiKey) {
      showFailureToast({
        title: "API Key Missing",
        message: "Please set your Google Places API key in preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    }
  }, [preferences.googlePlacesApiKey]);

  // Helper function to check if search text is valid
  const isValidSearchText = (text: string): boolean => {
    return text.trim().length > MIN_SEARCH_LENGTH;
  };

  // Search for places when the search text changes
  const performSearch = useCallback(async () => {
    if (!isValidSearchText(searchText) || !preferences.googlePlacesApiKey) {
      setPlaces([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPlaces(searchText);
      setPlaces(results);
    } catch (error) {
      console.error("Error searching places:", error);
      await showFailureToast({
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
      if (isValidSearchText(searchText)) {
        performSearch();
      }
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(debounceTimeout);
  }, [searchText, performSearch]);

  // Initial search if initialSearchText is provided
  useEffect(() => {
    if (initialSearchText && isValidSearchText(initialSearchText)) {
      performSearch();
    }
  }, [initialSearchText, performSearch, preferences.googlePlacesApiKey]);

  return {
    searchText,
    setSearchText,
    isLoading,
    places,
    hasApiKey: !!preferences.googlePlacesApiKey,
  };
}
