import { useState, useCallback } from "react";
import { getPreferenceValues, showToast, openExtensionPreferences, Toast } from "@raycast/api";
import { Preferences, PlaceSearchResult, OriginOption } from "../types";
import { getNearbyPlaces, geocodeAddress } from "../utils/googlePlacesApi";
import { showFailureToast } from "@raycast/utils";

export function useNearbyPlaces() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);

  const searchNearbyPlaces = useCallback(
    async (placeType: string, origin: OriginOption, customAddress: string, radius: number) => {
      try {
        setIsLoading(true);

        // Check if API key is set
        if (!preferences.googlePlacesApiKey) {
          await showFailureToast({
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

        // Helper function to geocode home address
        const geocodeHomeAddress = async (): Promise<{ lat: number; lng: number } | null> => {
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
            const location = await geocodeAddress(preferences.homeAddress);
            return location;
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

        // Determine the search location
        let searchLocation: { lat: number; lng: number } | null;
        if (origin === OriginOption.Home) {
          // Use home address
          searchLocation = await geocodeHomeAddress();
          if (!searchLocation) {
            setIsLoading(false);
            return null;
          }
        } else if (origin === OriginOption.Custom) {
          // Use custom address
          if (!customAddress.trim()) {
            await showFailureToast({ title: "Missing Address", message: "Please enter a custom address" });
            setIsLoading(false);
            return null;
          }

          try {
            searchLocation = await geocodeAddress(customAddress);
            if (!searchLocation) {
              await showFailureToast({
                title: "Invalid Address",
                message: "Could not find coordinates for the provided address",
              });
              setIsLoading(false);
              return null;
            }
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
            setIsLoading(false);
            return null;
          }
        } else {
          // Current location not directly supported in Raycast, use Home address as fallback
          await showFailureToast({
            title: "Using Home Address",
            message: "Current location is not available, using home address instead",
          });

          // Use home address as fallback
          searchLocation = await geocodeHomeAddress();
          if (!searchLocation) {
            setIsLoading(false);
            return null;
          }
        }

        // Search for nearby places
        try {
          const results = await getNearbyPlaces(searchLocation, placeType, radius);
          setPlaces(results);

          // Update toast
          toast.message = `Found ${results.length} places`;
          toast.style = Toast.Style.Success;

          return results;
        } catch (error) {
          console.error("Error searching for nearby places:", error);

          if (error instanceof Error && error.message.includes("ZERO_RESULTS")) {
            await showFailureToast({
              title: "No Places Found",
              message:
                "No places found matching your criteria. Try increasing the search radius or changing the place type.",
            });
          } else {
            await showFailureToast({
              title: "Failed to search for nearby places",
              message: error instanceof Error ? error.message : "Check your API key and network connection",
            });
          }
          return null;
        }
      } catch (error) {
        console.error("Error searching for nearby places:", error);
        await showFailureToast({
          title: "Failed to search for nearby places",
          message: error instanceof Error ? error.message : "Check your API key and network connection",
        });
        return null;
      } finally {
        setIsLoading(false);
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
