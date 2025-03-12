import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

// Default radius values
export const DEFAULT_RADIUS_KM = 5;
export const DEFAULT_RADIUS_MILES = 3;

// Default radius in meters for API calls (50km or ~31 miles)
export const DEFAULT_SEARCH_RADIUS_METRIC = 50000;
export const DEFAULT_SEARCH_RADIUS_IMPERIAL = Math.round(milesToKm(31) * 1000);

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
  return "$".repeat(level) || "Free";
}

/**
 * Format rating with different display options
 * @param rating Rating value
 * @param format Format option: 1 = "4.8 ★★★★★ (58)", 2 = "★★★★☆ (4.0)", 3 = "★★★★☆"
 * @param totalRatings Total number of ratings (only used in format 1)
 * @returns Formatted rating string
 */
export function formatRating(rating?: number, format: 1 | 2 | 3 = 2, totalRatings?: number): string {
  if (rating === undefined) return "No ratings yet";

  const stars = renderStarRating(rating);

  switch (format) {
    case 1: // Overall rating average, stars, (Total Ratings Count)
      return `${rating.toFixed(1)} ${stars}${totalRatings ? ` (${totalRatings})` : ""}`;
    case 2: // Stars, Rating
      return `${stars} (${rating.toFixed(1)})`;
    case 3: // Stars only
      return stars;
    default:
      return `${stars} (${rating.toFixed(1)})`;
  }
}

/**
 * Get the user's preferred unit system
 * @returns The user's preferred unit system ("metric" or "imperial")
 */
export function getUnitSystem(): "metric" | "imperial" {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.unitsystem || "metric";
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
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
      return `${distanceKm.toFixed(1)}km`;
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
      return `${distanceMiles.toFixed(1)}mi`;
    } else {
      // Round to nearest mile for larger distances
      return `${Math.round(distanceMiles)}mi`;
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
 * This is a wrapper around getUnitSystem that returns the value as unknown to avoid type issues
 * @returns The user's preferred unit system as unknown type for Google Maps API
 */
export function getUnitSystemForApi(): unknown {
  return getUnitSystem();
}

/**
 * Get the travel mode for Google Maps API
 * This is a helper to avoid type issues with the Google Maps API
 * @param mode The travel mode string
 * @returns The travel mode as unknown type for Google Maps API
 */
export function getTravelModeForApi(mode: string): unknown {
  return mode;
}

/**
 * Format distance for legacy code (kept for backward compatibility)
 * @param meters Distance in meters
 * @param unitSystem User's preferred unit system ("metric" or "imperial")
 * @returns Formatted distance string
 */
export function formatDistanceLegacy(meters: number, unitSystem: "metric" | "imperial"): string {
  return formatDistance(meters, "m", unitSystem);
}
