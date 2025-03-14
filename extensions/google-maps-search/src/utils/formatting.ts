// External library imports
import { getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences } from "../types";

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
 * Format rating with different display options
 * @param rating Rating value
 * @param format Format option: 1 = "4.8 ★★★★★ (58)", 2 = "★★★★☆ (4.0)", 3 = "★★★★☆"
 * @param totalRatings Total number of ratings (only used in format 1)
 * @returns Formatted rating string
 */
export function formatRating(rating?: number, format: 1 | 2 | 3 = 2, totalRatings?: number): string {
  if (rating === undefined) return "No Rating";

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
 * @param unitSystemOverride Optional override for the unit system
 * @returns Formatted distance string
 */
export function formatDistance(
  distance: number,
  unit: "km" | "m" = "km",
  unitSystemOverride?: "metric" | "imperial"
): string {
  const preferences = getPreferenceValues<Preferences>();
  const unitSystem = unitSystemOverride || preferences.unitSystem || "metric";

  // Convert to base unit (meters)
  const meters = unit === "km" ? distance * 1000 : distance;

  if (unitSystem === "metric") {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  } else {
    // Imperial
    const feet = meters * 3.28084;
    if (feet < 528) {
      // Less than 0.1 miles
      return `${Math.round(feet)}ft`;
    } else {
      const miles = feet / 5280;
      return `${miles.toFixed(1)}mi`;
    }
  }
}

/**
 * Format a duration in seconds to a human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "1h 30m" or "45m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Format a phone number for display
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // Format based on length
  if (digitsOnly.length === 10) {
    // US format: (555) 123-4567
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`;
  } else {
    // Return as is if we can't determine the format
    return phoneNumber;
  }
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

  if (street) formattedAddress += street;

  if (city) {
    if (formattedAddress) formattedAddress += ", ";
    formattedAddress += city;
  }

  if (state) {
    if (city) {
      formattedAddress += ", ";
    } else if (formattedAddress) {
      formattedAddress += ", ";
    }
    formattedAddress += state;
  }

  if (zip) {
    if (state) {
      formattedAddress += " ";
    } else if (formattedAddress) {
      formattedAddress += ", ";
    }
    formattedAddress += zip;
  }

  if (country && country !== "United States") {
    if (formattedAddress) formattedAddress += ", ";
    formattedAddress += country;
  }

  return formattedAddress;
}
