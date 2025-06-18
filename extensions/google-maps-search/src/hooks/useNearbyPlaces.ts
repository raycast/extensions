import { useState, useCallback, useRef, useEffect } from "react";
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

  // Cache for geocoded home address
  const cachedHomeAddressRef = useRef<{
    address: string;
    location: Location | null;
  }>({ address: "", location: null });

  const searchNearbyPlaces = useCallback(
    async (placeType: string, origin: OriginOption, radius: number, customAddress?: string, openNow = false) => {
      setIsLoading(true);

      try {
        // Verify API key
        if (!preferences.googlePlacesApiKey) {
          // Clear any previous results
          setPlaces([]);
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
          // Clear any previous results
          setPlaces([]);
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
          // Clear any previous results
          setPlaces([]);
          handleSearchError(error);
          return null;
        }
      } catch (error) {
        console.error("Unexpected error in searchNearbyPlaces:", error);
        // Clear any previous results
        setPlaces([]);
        handleSearchError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [preferences.googlePlacesApiKey, preferences.homeAddress]
  );

  // Update cached home address when preferences change
  useEffect(() => {
    // Reset cache when home address changes
    if (preferences.homeAddress !== cachedHomeAddressRef.current.address) {
      cachedHomeAddressRef.current = { address: preferences.homeAddress, location: null };
    }
  }, [preferences.homeAddress]);

  // Helper function to get search location based on origin type
  const getSearchLocation = async (origin: OriginOption, customAddress?: string): Promise<Location | null> => {
    // For home address
    if (origin === OriginOption.Home) {
      // Validate home address is not empty
      if (!preferences.homeAddress?.trim()) {
        showFailureToast({
          title: "Home Address Missing",
          message: "Please set your home address in preferences",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        return null;
      }

      // Check if we have a cached result for the current home address
      if (cachedHomeAddressRef.current.address === preferences.homeAddress && cachedHomeAddressRef.current.location) {
        return cachedHomeAddressRef.current.location;
      }

      // Otherwise geocode and cache the result
      const location = await geocodePlace(preferences.homeAddress, { source: "home" });
      if (location) {
        cachedHomeAddressRef.current = {
          address: preferences.homeAddress,
          location: location,
        };
      }
      return location;
    }

    // For custom address
    if (origin === OriginOption.Custom) {
      // Validate custom address is not empty
      if (!customAddress?.trim()) {
        showFailureToast({
          title: "Custom Address Missing",
          message: "Please enter a custom address",
        });
        return null;
      }
      return geocodePlace(customAddress, { source: "custom" });
    }

    // This should never happen with TypeScript's enum type checking
    // Throwing an error is better than silently falling back
    const errorMessage = `Invalid origin option: ${origin}`;
    console.error(errorMessage);

    showFailureToast({
      title: "Application Error",
      message: "An unexpected error occurred with the origin selection.",
    });

    // Throw error for easier debugging
    throw new Error(errorMessage);
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
