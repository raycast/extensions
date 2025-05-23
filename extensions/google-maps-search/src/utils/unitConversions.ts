// External library imports
import { getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences, TravelMode, UnitSystem } from "../types";
import { PLACE_TYPES } from "../types/places";

// Conversion constants
export const KM_PER_MILE = 1.60934;
export const FEET_PER_METER = 3.28084;
export const FEET_PER_MILE = 5280; // 1 mile = 5280 feet
export const METERS_PER_MILE = 1609.34;

// Default values in meters
export const DEFAULT_RADIUS_METERS = 5000; // 5km
export const DEFAULT_SEARCH_RADIUS_METERS = 50000; // 50km

/**
 * Convert miles to kilometers
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

/**
 * Convert meters to feet
 * @param meters Distance in meters
 * @returns Distance in feet
 */
export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

/**
 * Convert feet to meters
 * @param feet Distance in feet
 * @returns Distance in meters
 */
export function feetToMeters(feet: number): number {
  return feet / FEET_PER_METER;
}

/**
 * Convert meters to miles
 * @param meters Distance in meters
 * @returns Distance in miles
 */
export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

/**
 * Convert miles to meters
 * @param miles Distance in miles
 * @returns Distance in meters
 */
export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

/**
 * Get the user's preferred unit system
 * @returns The user's preferred unit system ("metric" or "imperial")
 */
export function getUnitSystem(): "metric" | "imperial" {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.unitSystem || "metric";
}

/**
 * Get the default search radius in the user's preferred unit system
 * @returns Default search radius in the user's preferred unit (km or miles)
 */
export function getDefaultSearchRadiusInPreferredUnit(): number {
  const unitSystem = getUnitSystem();
  if (unitSystem === "metric") {
    return Math.round(DEFAULT_SEARCH_RADIUS_METERS / 1000); // Convert to km
  } else {
    return Math.round(kmToMiles(DEFAULT_SEARCH_RADIUS_METERS / 1000)); // Convert to miles
  }
}

/**
 * Get the default search radius in meters
 * @returns Default search radius in meters
 */
export function getDefaultSearchRadiusInMeters(): number {
  return DEFAULT_SEARCH_RADIUS_METERS;
}

/**
 * Get the default radius in the user's preferred unit system
 * @returns Default radius in the user's preferred unit (km or miles)
 */
export function getDefaultRadiusInPreferredUnit(): number {
  const unitSystem = getUnitSystem();
  if (unitSystem === "metric") {
    return Math.round(DEFAULT_RADIUS_METERS / 1000); // Convert to km
  } else {
    return Math.round(kmToMiles(DEFAULT_RADIUS_METERS / 1000)); // Convert to miles
  }
}

/**
 * Get the default radius in meters
 * @returns Default radius in meters
 */
export function getDefaultRadiusInMeters(): number {
  return DEFAULT_RADIUS_METERS;
}

/**
 * Format distance in a user-friendly way, respecting the user's unit system preference
 * @param distance Distance value
 * @param unit Unit of the distance value ('km' for kilometers or 'm' for meters)
 * @param unitSystemOverride Optional override for the unit system
 * @returns Formatted distance string
 */
export function formatDistance(
  distance: number,
  unit: "km" | "m" = "km",
  unitSystemOverride?: "metric" | "imperial"
): string {
  if (distance < 0) {
    console.warn(`Invalid distance value: ${distance}. Expected non-negative number.`);
    return "Invalid distance";
  }
  const unitSystem = unitSystemOverride || getUnitSystem();

  // Convert to kilometers if input is in meters
  const distanceKm = unit === "m" ? distance / 1000 : distance;

  if (unitSystem === "metric") {
    // Metric system (kilometers/meters)
    if (distanceKm < 1) {
      // Convert to meters if less than 1 km
      return `${Math.round(distanceKm * 1000)} m`;
    } else if (distanceKm < 10) {
      // Show one decimal place for distances under 10 km
      return `${distanceKm.toFixed(1)} km`;
    } else {
      // Round to nearest km for larger distances
      return `${Math.round(distanceKm)} km`;
    }
  } else {
    // Imperial system (miles/feet)
    const distanceMiles = kmToMiles(distanceKm);

    if (distanceMiles < 0.1) {
      // Convert to feet if less than 0.1 miles
      return `${Math.round(distanceMiles * FEET_PER_MILE)} ft`;
    } else if (distanceMiles < 10) {
      // Show one decimal place for distances under 10 miles
      return `${distanceMiles.toFixed(1)} mi`;
    } else {
      // Round to nearest mile for larger distances
      return `${Math.round(distanceMiles)} mi`;
    }
  }
}

/**
 * Get the user's preferred unit system for Google Maps API
 * @returns The user's preferred unit system for Google Maps API
 */
export function getUnitSystemForApi(): UnitSystem {
  return getUnitSystem() === "metric" ? UnitSystem.metric : UnitSystem.imperial;
}

/**
 * Get the travel mode for Google Maps API
 * @param mode The travel mode string
 * @returns The validated travel mode for Google Maps API
 */
export function getTravelModeForApi(mode: string): TravelMode {
  const validModes = Object.values(TravelMode);

  if (validModes.includes(mode as TravelMode)) {
    return mode as TravelMode;
  }

  console.warn(`Invalid travel mode: ${mode}. Using ${TravelMode.driving} instead.`);
  return TravelMode.driving;
}

/**
 * Determines if the input is likely a business name rather than a place type
 * @param input The user input string
 * @returns True if the input appears to be a business name
 */
export function isLikelyBusinessName(input: string): boolean {
  // Check if input contains multiple words (most business names do)
  if (input.trim().split(/\s+/).length > 1) {
    return true;
  }

  // Check if input contains capital letters (indicating proper nouns)
  if (/[A-Z]/.test(input) && input !== input.toUpperCase()) {
    return true;
  }

  // Check if input contains special characters common in business names
  if (/[&'"]/.test(input)) {
    return true;
  }

  // Check if input is not in our place types list
  const normalizedInput = input.toLowerCase().replace(/\s+/g, "_");
  const isKnownPlaceType = PLACE_TYPES.some(
    (type) => type.value === normalizedInput || type.title.toLowerCase() === input.toLowerCase()
  );

  return !isKnownPlaceType;
}
