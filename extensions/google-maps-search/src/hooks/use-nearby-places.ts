import { useState, useCallback } from "react";
import { getPreferenceValues, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { Preferences, PlaceSearchResult, OriginOption } from "../types";
import { getNearbyPlaces, geocodeAddress } from "../utils/google-places-api";

export function useNearbyPlaces() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);

  const searchNearbyPlaces = useCallback(
    async (placeType: string, origin: OriginOption, customAddress: string, radius: number) => {
      setIsLoading(true);
      try {
        // Check if API key is set
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
          setIsLoading(false);
          return null;
        }

        // Show loading toast
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Searching for nearby places...",
        });

        // Determine the search location
        let searchLocation;
        if (origin === OriginOption.Home) {
          // Use home address
          searchLocation = await geocodeAddress(preferences.homeAddress);
          if (!searchLocation) {
            toast.style = Toast.Style.Failure;
            toast.title = "Geocoding Failed";
            toast.message = "Could not find coordinates for your home address";
            setIsLoading(false);
            return null;
          }
        } else if (origin === OriginOption.Custom) {
          // Use custom address
          if (!customAddress.trim()) {
            toast.style = Toast.Style.Failure;
            toast.title = "Missing Address";
            toast.message = "Please enter a custom address";
            setIsLoading(false);
            return null;
          }
          searchLocation = await geocodeAddress(customAddress);
          if (!searchLocation) {
            toast.style = Toast.Style.Failure;
            toast.title = "Geocoding Failed";
            toast.message = "Could not find coordinates for the provided address";
            setIsLoading(false);
            return null;
          }
        } else {
          // Current location not directly supported in Raycast, use Home address as fallback
          toast.style = Toast.Style.Animated;
          toast.title = "Using Home Address";
          toast.message = "Current location is not available, using home address instead";

          // Use home address as fallback
          searchLocation = await geocodeAddress(preferences.homeAddress);
          if (!searchLocation) {
            toast.style = Toast.Style.Failure;
            toast.title = "Geocoding Failed";
            toast.message = "Could not find coordinates for your home address";
            setIsLoading(false);
            return null;
          }
        }

        // Search for nearby places
        const results = await getNearbyPlaces(searchLocation, placeType, radius);
        setPlaces(results);

        // Update toast
        toast.style = Toast.Style.Success;
        toast.title = "Search Complete";
        toast.message = `Found ${results.length} places`;

        setIsLoading(false);
        return results;
      } catch (error) {
        console.error("Error searching for nearby places:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: "Failed to search for nearby places. Check your API key and network connection.",
        });
        setIsLoading(false);
        return null;
      }
    },
    [preferences.googlePlacesApiKey, preferences.homeAddress]
  );

  return {
    isLoading,
    places,
    searchNearbyPlaces,
    hasApiKey: !!preferences.googlePlacesApiKey,
  };
}
