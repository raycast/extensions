/**
 * Utilities for handling location data
 */

/**
 * Format a location (either string address or coordinates) to a string
 * @param location Location as string or coordinates object
 * @returns Formatted location string
 */
export function formatLocation(location: string | { lat: number; lng: number }): string {
  return typeof location === "string" ? location : `${location.lat},${location.lng}`;
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
 * Format coordinates as a string
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted coordinates string
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
