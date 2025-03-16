/**
 * Utilities for handling location data
 */

// Constants
/**
 * Radius of the Earth in kilometers
 */
export const EARTH_RADIUS_KM = 6371;

/**
 * Format a location (either string address or coordinates) to a string
 * @param location Location as string, coordinates object, or separate lat/lng values
 * @returns Formatted location string
 */
export function formatLocation(location: string | { lat: number; lng: number } | number, lng?: number): string {
  // Case 1: Already a string
  if (typeof location === "string") {
    return location;
  }

  // Case 2: Separate lat/lng parameters
  if (typeof location === "number" && typeof lng === "number") {
    return `${location},${lng}`;
  }

  // Case 3: Location object with lat/lng properties
  if (isValidLocation(location)) {
    return `${location.lat},${location.lng}`;
  }

  throw new Error("Invalid location format");
}

/**
 * Check if a location object is valid
 * @param location Location object to check
 * @returns True if location has valid lat and lng properties
 */
export function isValidLocation(location: unknown): location is { lat: number; lng: number } {
  return (
    Boolean(location) &&
    typeof location === "object" &&
    location !== null &&
    "lat" in location &&
    "lng" in location &&
    typeof (location as { lat: unknown }).lat === "number" &&
    typeof (location as { lng: unknown }).lng === "number"
  );
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
