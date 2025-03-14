import { useState, useCallback } from "react";
import { getPreferenceValues, showToast, openExtensionPreferences, Toast } from "@raycast/api";
import { Preferences, PlaceSearchResult, OriginOption } from "../types";
import { getNearbyPlaces, geocodeAddress } from "../utils/googlePlacesApi";
import { showFailureToast } from "@raycast/utils";

export function useNearbyPlaces() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);

  // Define location type for reuse
  type Location = { lat: number; lng: number };

  const searchNearbyPlaces = useCallback(
    async (placeType: string, origin: OriginOption, customAddress: string, radius: number) => {
      setIsLoading(true);
      let toast: Toast | undefined;

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

        // Show loading toast
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Searching for nearby places...",
        });

        // Get search location based on origin type
        const searchLocation = await getSearchLocation(origin, customAddress);
        if (!searchLocation) {
          if (toast) {
            toast.style = Toast.Style.Failure;
            toast.title = "Search failed";
          }
          return null;
        }

        // Search for nearby places
        try {
          const results = await getNearbyPlaces(searchLocation, placeType, radius);
          setPlaces(results);

          // Update toast on success
          if (toast) {
            toast.message = `Found ${results.length} places`;
            toast.style = Toast.Style.Success;
          }

          return results;
        } catch (error) {
          handleSearchError(error, toast);
          return null;
        }
      } catch (error) {
        console.error("Unexpected error in searchNearbyPlaces:", error);
        handleSearchError(error, toast);
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
      return geocodeHomeAddress();
    }

    // For custom address
    if (origin === OriginOption.Custom) {
      if (!customAddress.trim()) {
        await showFailureToast({
          title: "Missing Address",
          message: "Please enter a custom address",
        });
        return null;
      }

      try {
        const location = await geocodeAddress(customAddress);
        if (!location) {
          await showFailureToast({
            title: "Invalid Address",
            message: "Could not find coordinates for the provided address",
          });
        }
        return location;
      } catch (error) {
        if (error instanceof Error && error.message.includes("ZERO_RESULTS")) {
          await showFailureToast({
            title: "Invalid Address",
            message: "Could not find coordinates for the provided address. Please check and try again.",
          });
        } else {
          await showFailureToast({
            title: "Geocoding Failed",
            message: "Could not find coordinates for the provided address",
          });
        }
        return null;
      }
    }

    // Fallback for any other cases (shouldn't happen with current enum values)
    console.warn(`Unexpected origin option: ${origin}, using home address as fallback`);
    await showToast({
      style: Toast.Style.Animated,
      title: "Using Home Address",
      message: "Using home address as fallback",
    });
    return geocodeHomeAddress();
  };

  // Helper function to geocode home address
  const geocodeHomeAddress = async (): Promise<Location | null> => {
    if (!preferences.homeAddress || preferences.homeAddress.trim() === "") {
      await showFailureToast({
        title: "Home Address Missing",
        message: "Please set your home address in preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
      return null;
    }

    try {
      return await geocodeAddress(preferences.homeAddress);
    } catch (error) {
      if (error instanceof Error && error.message.includes("ZERO_RESULTS")) {
        await showFailureToast({
          title: "Invalid Home Address",
          message: "Could not find coordinates for your home address. Please check it in preferences.",
        });
      } else {
        await showFailureToast({
          title: "Geocoding Failed",
          message: "Could not find coordinates for your home address",
        });
      }
      return null;
    }
  };

  // Helper function to handle search errors
  const handleSearchError = (error: unknown, toast: Toast | undefined) => {
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Search failed";
    }

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
