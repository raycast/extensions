import { useState, useCallback } from "react";
import { getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { Preferences, PlaceSearchResult, OriginOption } from "../types";
import { getNearbyPlaces } from "../utils/googlePlacesApi";
import { showFailureToast } from "@raycast/utils";
import { geocodePlace } from "../hooks/useGeocoding";

export function useNearbyPlaces() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);

  // Define location type for reuse
  type Location = { lat: number; lng: number };

  const searchNearbyPlaces = useCallback(
    async (placeType: string, origin: OriginOption, customAddress: string, radius: number, openNow = false) => {
      setIsLoading(true);

      try {
        // Verify API key
        if (!preferences.googlePlacesApiKey) {
          showFailureToast({
            title: "API Key Missing",
            message: "Please set your Google Places API key in preferences",
            primaryAction: {
              title: "Open Preferences",
              onAction: () => openExtensionPreferences(),
            },
          });
          return null;
        }

        // Get search location based on origin type
        const searchLocation = await getSearchLocation(origin, customAddress);
        if (!searchLocation) {
          showFailureToast({
            title: "Search failed",
            message: "Failed to get search location",
          });
          return null;
        }

        // Search for nearby places
        try {
          const results = await getNearbyPlaces(searchLocation, placeType, radius, openNow);
          setPlaces(results);

          return results;
        } catch (error) {
          handleSearchError(error);
          return null;
        }
      } catch (error) {
        console.error("Unexpected error in searchNearbyPlaces:", error);
        handleSearchError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [preferences.googlePlacesApiKey, preferences.homeAddress]
  );

  // Helper function to get search location based on origin type
  const getSearchLocation = async (origin: OriginOption, customAddress: string): Promise<Location | null> => {
    // For home address
    if (origin === OriginOption.Home) {
      return geocodePlace(preferences.homeAddress, { source: "home" });
    }

    // For custom address
    if (origin === OriginOption.Custom) {
      return geocodePlace(customAddress, { source: "custom" });
    }

    // Fallback for any other cases (shouldn't happen with current enum values)
    console.warn(`Unexpected origin option: ${origin}, using home address as fallback`);
    return geocodePlace(preferences.homeAddress, { source: "home" });
  };

  // Helper function to handle search errors
  const handleSearchError = (error: unknown) => {
    // Only show specific error messages below
    if (error instanceof Error && error.message.includes("ZERO_RESULTS")) {
      showFailureToast({
        title: "No Places Found",
        message: "No places found matching your criteria. Try increasing the search radius or changing the place type.",
      });
    } else {
      showFailureToast({
        title: "Failed to search for nearby places",
        message: error instanceof Error ? error.message : "Check your API key and network connection",
      });
    }
  };

  return {
    isLoading,
    places,
    searchNearbyPlaces,
    hasApiKey: !!preferences.googlePlacesApiKey,
  };
}
