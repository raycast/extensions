// External library imports
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

// Internal type exports
import { TravelMode, UnitSystem } from "../types/googleMapsApi";
import { PLACE_TYPES } from "../types/places";

// Default radius values
export const DEFAULT_RADIUS_KM = 5;
export const DEFAULT_RADIUS_MILES = 3;

// Default radius in meters for API calls (50km or ~31 miles)
export const DEFAULT_SEARCH_RADIUS_METRIC = 50000;
export const DEFAULT_SEARCH_RADIUS_IMPERIAL = Math.round(31 * 1609.34);

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

/**
 * Convert miles to kilometers
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km / 1.60934;
}

/**
 * Convert meters to feet
 * @param meters Distance in meters
 * @returns Distance in feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
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
 * Renders star rating as text (e.g., "★★★★☆" for 4.0)
 */
export function renderStarRating(rating: number | undefined): string {
  if (rating === undefined) return "No Rating";

  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);
}

/**
 * Format price level as dollar signs
 * @param level Price level (0-4)
 * @returns Formatted price level as string
 */
export function formatPriceLevel(level?: number): string {
  if (level === undefined) return "Price not available";

  // Validate that level is between 0-4
  if (level < 0 || level > 4 || !Number.isInteger(level)) {
    console.warn(`Invalid price level: ${level}. Expected integer between 0-4.`);
    return "Price not available";
  }

  return level === 0 ? "Free" : "$".repeat(level);
}

/**
 * Format rating with different display options
 * @param rating Rating value
 * @param format Format option: 1 = "4.8 ★★★★★ (58)", 2 = "★★★★☆ (4.0)", 3 = "★★★★☆"
 * @param totalRatings Total number of ratings (only used in format 1)
 * @returns Formatted rating string
 * @throws Error if format is not 1, 2, or 3
 */
export function formatRating(rating?: number, format: 1 | 2 | 3 = 2, totalRatings?: number): string {
  if (rating === undefined) return "No ratings yet";

  // Validate rating is within a reasonable range
  if (rating < 0 || rating > 5) {
    console.warn(`Invalid rating value: ${rating}. Expected value between 0-5.`);
    return "Invalid rating";
  }

  const stars = renderStarRating(rating);

  let formattedRating: string;

  switch (format) {
    case 1: // Overall rating average, stars, (Total Ratings Count)
      formattedRating = `${rating.toFixed(1)} ${stars}${totalRatings ? ` (${totalRatings})` : ""}`;
      break;
    case 2: // Stars, Rating
      formattedRating = `${stars} (${rating.toFixed(1)})`;
      break;
    case 3: // Stars only
      formattedRating = stars;
      break;
    default:
      // This should never happen due to TypeScript's type checking,
      // but we handle it anyway for runtime safety
      console.error(`Invalid format: ${format}. Expected 1, 2, or 3.`);
      throw new Error(`Invalid format: ${format}. Expected 1, 2, or 3.`);
  }

  return formattedRating;
}

/**
 * Get the default radius based on the user's preferred unit system
 * @returns Default radius as a string (5 for km, 3 for miles)
 */
export function getDefaultRadius(): string {
  return getUnitSystem() === "metric" ? DEFAULT_RADIUS_KM.toString() : DEFAULT_RADIUS_MILES.toString();
}

/**
 * Calculate distance between two coordinates
 * @param lat1 Latitude of first point (-90 to 90)
 * @param lon1 Longitude of first point (-180 to 180)
 * @param lat2 Latitude of second point (-90 to 90)
 * @param lon2 Longitude of second point (-180 to 180)
 * @returns Distance in kilometers
 * @throws Error if any coordinate is outside its valid range
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Validate latitude values (-90 to 90)
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    const invalidLat = lat1 < -90 || lat1 > 90 ? lat1 : lat2;
    const errorMsg = `Invalid latitude value: ${invalidLat}. Latitude must be between -90 and 90 degrees.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate longitude values (-180 to 180)
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    const invalidLon = lon1 < -180 || lon1 > 180 ? lon1 : lon2;
    const errorMsg = `Invalid longitude value: ${invalidLon}. Longitude must be between -180 and 180 degrees.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
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
      return `${Math.round(distanceMiles * 5280)} ft`;
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
 * Get the default search radius in meters based on the user's preferred unit system
 * @returns Default search radius in meters
 */
export function getDefaultSearchRadiusInMeters(): number {
  return getUnitSystem() === "metric" ? DEFAULT_SEARCH_RADIUS_METRIC : DEFAULT_SEARCH_RADIUS_IMPERIAL;
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
