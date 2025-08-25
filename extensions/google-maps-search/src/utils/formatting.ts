// External library imports
import { getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences, PlaceSearchResult } from "../types";
import { makeSearchURL } from "./url";
import { calculateDistance } from "./common";

/**
 * Interface for formatting options
 */
export interface FormattingOptions {
  /**
   * Unit system preference (metric or imperial)
   */
  unitSystem?: "metric" | "imperial";
}

/**
 * Interface for rating format options
 */
export interface RatingFormatOptions {
  /**
   * Format style for ratings
   * - 1: "4.8 ★★★★★ (58)" - rating first, then stars, then total ratings
   * - 2: "★★★★☆ (4.0)" - stars first, then rating in parentheses
   * - 3: "★★★★☆" - stars only
   */
  format?: 1 | 2 | 3;

  /**
   * Total number of ratings (only used in format 1)
   */
  totalRatings?: number;
}

/**
 * Renders star rating as text (e.g., "★★★★☆" for 4.0)
 * @param rating The rating value
 * @returns Formatted star rating string
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
  if (level === undefined) return "";

  switch (level) {
    case 0:
      return "Free";
    case 1:
      return "$";
    case 2:
      return "$$";
    case 3:
      return "$$$";
    case 4:
      return "$$$$";
    default:
      return "";
  }
}

/**
 * Format rating with different display options
 * @param rating Rating value
 * @param options Rating format options
 * @returns Formatted rating string
 */
export function formatRating(rating?: number, options?: RatingFormatOptions): string {
  if (rating === undefined) return "No Rating";

  const format = options?.format || 2;
  const totalRatings = options?.totalRatings;
  const stars = renderStarRating(rating);

  switch (format) {
    case 1:
      return `${rating.toFixed(1)} ${stars}${totalRatings ? ` (${totalRatings})` : ""}`;
    case 2:
      return `${stars} (${rating.toFixed(1)})`;
    case 3:
      return stars;
    default:
      return `${rating.toFixed(1)} ${stars}`;
  }
}

/**
 * Format distance in a user-friendly way, respecting the user's unit system preference
 * @param distance Distance value
 * @param unit Unit of the distance value ('km' for kilometers or 'm' for meters)
 * @param options Optional formatting options
 * @returns Formatted distance string
 */
export function formatDistance(distance: number, unit: "km" | "m" = "m", options?: FormattingOptions): string {
  // Get user preferences
  const preferences = getPreferenceValues<Preferences>();
  const unitSystem = options?.unitSystem || preferences.unitSystem || "metric";

  // Convert to meters for consistency
  let meters: number;
  if (unit === "km") {
    meters = distance * 1000;
  } else if (unit === "m") {
    meters = distance;
  } else {
    throw new Error(`Unsupported unit: ${unit}`);
  }

  if (unitSystem === "imperial") {
    // Convert to miles
    const miles = meters / 1609.34;

    if (miles < 0.1) {
      // Show in feet for short distances
      const feet = Math.round(meters * 3.28084);
      return `${feet} ft`;
    } else if (miles < 10) {
      // Show with one decimal for medium distances
      return `${miles.toFixed(1)} mi`;
    } else {
      // Show as integer for longer distances
      return `${Math.round(miles)} mi`;
    }
  } else {
    // Metric system
    if (meters < 1000) {
      // Show in meters for short distances
      return `${Math.round(meters)} m`;
    } else {
      // Show in kilometers for longer distances
      const km = meters / 1000;
      return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
    }
  }
}

/**
 * Format a duration in seconds to a human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "1h 30m" or "45m")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format a phone number for display
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Format based on length
  if (cleaned.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === "1") {
    // US with country code: +1 (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if we can't format it
  return phoneNumber;
}

/**
 * Format an address for display
 * @param components Address components
 * @returns Formatted address string
 */
export function formatAddress(components: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): string {
  const { street, city, state, zip, country } = components;

  let formattedAddress = "";

  if (street) {
    formattedAddress += street;
  }

  if (city) {
    formattedAddress += formattedAddress ? `, ${city}` : city;
  }

  if (state) {
    formattedAddress += formattedAddress ? `, ${state}` : state;
  }

  if (zip) {
    formattedAddress += formattedAddress ? ` ${zip}` : zip;
  }

  if (country) {
    formattedAddress += formattedAddress ? `, ${country}` : country;
  }

  return formattedAddress;
}

/**
 * Format place search results into a markdown string
 * @param places Array of place search results
 * @param userLocation User's current location for distance calculation
 * @returns Formatted markdown string with place details
 */
export function formatPlaceResults(places: PlaceSearchResult[], userLocation: { lat: number; lng: number }): string {
  if (!places || places.length === 0) {
    return "No places found.";
  }

  let markdown = "";

  for (const place of places) {
    // Calculate distance from user location
    const distance = calculateDistance(userLocation.lat, userLocation.lng, place.location.lat, place.location.lng);

    // Format place details
    markdown += `## ${place.name}\n\n`;

    // Add address
    markdown += `**Address:** ${place.address || place.vicinity || "Not available"}\n\n`;

    // Add distance
    markdown += `**Distance:** ${formatDistance(distance)}\n\n`;

    // Add rating if available
    if (place.rating !== undefined) {
      markdown += `**Rating:** ${formatRating(place.rating, {
        format: 2,
        totalRatings: place.userRatingsTotal,
      })}\n\n`;
    }

    // Add price level if available
    if (place.priceLevel !== undefined) {
      markdown += `**Price:** ${formatPriceLevel(place.priceLevel)}\n\n`;
    }

    // Add open now status if available
    if (place.openNow !== undefined) {
      markdown += `**Status:** ${place.openNow ? "Open Now" : "Closed"}\n\n`;
    }

    // Add types if available
    if (place.types && place.types.length > 0) {
      const readableTypes = place.types
        .map((type) => type.replace(/_/g, " "))
        .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
        .join(", ");

      markdown += `**Categories:** ${readableTypes}\n\n`;
    }

    // Add Google Maps link
    const encodedName = encodeURIComponent(place.name);
    const encodedAddress = encodeURIComponent(place.address || place.vicinity || "");
    markdown += `[View on Google Maps](${makeSearchURL(`${encodedName} ${encodedAddress}`)})\n\n`;

    // Add separator between places
    markdown += `---\n\n`;
  }

  return markdown;
}
