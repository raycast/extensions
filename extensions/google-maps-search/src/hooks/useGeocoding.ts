import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences } from "../types";
import { geocodeAddress, searchPlaces } from "../utils/googlePlacesApi";

/**
 * Type for geocoding options
 */
type GeocodingOptions = {
  showToasts?: boolean;
  source?: "home" | "custom";
  locationBias?: string | { lat: number; lng: number };
};

/**
 * Type for geocoding result
 */
type GeocodingResult = { lat: number; lng: number } | null;

/**
 * Safely geocode a place name or address with fallback to search
 * @param place The place name or address to geocode
 * @param options Optional configuration for geocoding behavior
 * @returns Location coordinates or null if geocoding failed
 */
export async function geocodePlace(
  place: string,
  options: GeocodingOptions = { showToasts: true }
): Promise<GeocodingResult> {
  if (!place.trim()) {
    if (options.showToasts) {
      await showFailureToast({
        title: "Missing Address",
        message: options.source === "home" ? "Home address is not set in preferences" : "Please enter an address",
      });
    }
    return null;
  }

  try {
    console.log(`Geocoding place: "${place}"${options.locationBias ? ` with location bias` : ""}`);

    // First try direct geocoding
    const coords = await geocodeAddress(place, options.locationBias);
    if (coords) {
      console.log(`Successfully geocoded "${place}" to:`, coords);
      return coords;
    }

    // If geocoding fails, try using the Places API search
    console.log(
      `Geocoding failed for "${place}", trying search API instead${options.locationBias ? " with location bias" : ""}`
    );

    // If we have a location bias, convert it to coordinates for the search
    let locationForSearch: { lat: number; lng: number } | undefined = undefined;

    if (options.locationBias) {
      if (typeof options.locationBias === "string") {
        // Try to geocode the location bias if it's a string
        const biasCoords = await geocodeAddress(options.locationBias);
        if (biasCoords) {
          locationForSearch = biasCoords;
        }
      } else {
        // Use the coordinates directly if provided
        locationForSearch = options.locationBias;
      }
    }

    const searchResults = await searchPlaces(place, locationForSearch);

    if (searchResults && searchResults.length > 0) {
      console.log(`Found "${place}" via search API:`, searchResults[0].location);
      return searchResults[0].location;
    }

    console.log(`No results found for "${place}"`);

    if (options.showToasts) {
      await showFailureToast({
        title: "Geocoding Failed",
        message: `Could not find location for "${place}"`,
      });
    }

    return null;
  } catch (error) {
    console.error(`Error geocoding "${place}":`, error);

    if (options.showToasts) {
      await showFailureToast({
        title: "Geocoding Error",
        message: `Error finding location for "${place}"`,
      });
    }

    return null;
  }
}

/**
 * Hook for geocoding addresses with loading state
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  /**
   * Geocode any address with loading state
   * @param address The address to geocode (if undefined, uses home address from preferences)
   * @param options Optional configuration for geocoding behavior
   * @returns Location coordinates or null if geocoding failed
   */
  const geocode = async (
    address?: string,
    options: GeocodingOptions = { showToasts: true }
  ): Promise<GeocodingResult> => {
    setIsLoading(true);
    setError(null);

    try {
      if (address) {
        return await geocodePlace(address, { ...options, source: "custom" });
      } else {
        return await geocodePlace(preferences.homeAddress, { ...options, source: "home" });
      }
    } catch (err) {
      // If it's already an Error instance, use it directly
      if (err instanceof Error) {
        setError(err);
        return null;
      }

      // Define an interface for our extended error type
      interface ExtendedError extends Error {
        originalError: unknown;
      }

      // Create a new Error with the string representation
      const error = new Error(String(err)) as ExtendedError;
      // Add original error as a property for debugging
      error.originalError = err;

      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { geocode, isLoading, error };
}
