import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences } from "../types";
import { geocodeAddress } from "../utils/googlePlacesApi";

/**
 * Hook for geocoding addresses
 * Centralizes geocoding logic and error handling
 */
export function useGeocoding() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Geocode the user's home address from preferences
   * @returns Location coordinates or null if geocoding failed
   */
  const geocodeHomeAddress = async (): Promise<{ lat: number; lng: number } | null> => {
    setIsLoading(true);
    try {
      const location = await geocodeAddress(preferences.homeAddress);
      if (!location) {
        await showFailureToast({
          title: "Geocoding Failed",
          message: "Could not find coordinates for your home address",
        });
      }
      return location;
    } catch (error) {
      console.error("Error geocoding home address:", error);
      await showFailureToast({
        title: "Geocoding Error",
        message: String(error),
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Geocode a custom address provided by the user
   * @param address The address to geocode
   * @returns Location coordinates or null if geocoding failed
   */
  const geocodeCustomAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim()) {
      await showFailureToast({
        title: "Missing Address",
        message: "Please enter a custom address",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const location = await geocodeAddress(address);
      if (!location) {
        await showFailureToast({
          title: "Geocoding Failed",
          message: "Could not find coordinates for the provided address",
        });
      }
      return location;
    } catch (error) {
      console.error("Error geocoding custom address:", error);
      await showFailureToast({
        title: "Geocoding Error",
        message: String(error),
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    geocodeHomeAddress,
    geocodeCustomAddress,
    isLoading,
  };
}
