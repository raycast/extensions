// External library imports
import { getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences } from "../types";

/**
 * Given an origin, a destination, and a travel mode, returns a direction url according to the following specs:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * @param origin The origin address (uses home address from preferences if empty)
 * @param destination The destination address
 * @param transporttype One of four possible transit types
 * @returns A properly URI encoded string according to Google Maps documentation
 */
export function makeDirectionsURL(origin: string, destination: string, transporttype: string): string {
  const mapsBase = "https://www.google.com/maps/dir/?api=1";

  // If origin is empty, get the home address from preferences
  if (!origin) {
    const preferences = getPreferenceValues<Preferences>();
    origin = preferences.homeAddress || "";
  }

  return (
    mapsBase +
    "&origin=" +
    encodeURI(origin) +
    "&destination=" +
    encodeURI(destination) +
    "&travelmode=" +
    encodeURI(transporttype)
  );
}

/**
 * Given a query string, returns search url according to the following specs:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * @param query The query address
 * @returns A properly URI encoded string according to Google Maps documentation
 */
export function makeSearchURL(query: string): string {
  const mapsBase = "https://www.google.com/maps/search/?api=1";
  return mapsBase + "&query=" + encodeURIComponent(query);
}

/**
 * Creates a Google Maps place URL that makes it easier to copy coordinates
 * Using the "place" endpoint instead of "search" makes it easier to get coordinates
 *
 * @param query The query string for the place
 * @returns A properly URI encoded Google Maps place URL
 */
export function createPlaceURL(query: string): string {
  return `https://www.google.com/maps/place/${encodeURIComponent(query)}`;
}

/**
 * Extracts coordinates from a Google Maps URL
 * Note: This is a fallback method and may not always work reliably
 *
 * @param url The Google Maps URL
 * @returns An object with lat and lng properties or null if coordinates couldn't be extracted
 */
export function extractCoordinatesFromURL(url: string): { lat: number; lng: number } | null {
  try {
    // Try to extract coordinates from URL
    // Example URL pattern: https://www.google.com/maps/place/.../@37.7749,-122.4194,15z/...
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match && match.length >= 3) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    return null;
  } catch (error) {
    console.error("Error extracting coordinates:", error);
    return null;
  }
}

/**
 * Formats coordinates as a string in various formats
 *
 * @param coordinates The coordinates object with lat and lng properties
 * @param format The format to use: 'decimal' (default), 'dms' (degrees, minutes, seconds)
 * @returns A formatted string representation of the coordinates
 */
export function formatCoordinates(
  coordinates: { lat: number; lng: number } | null,
  format: "decimal" | "dms" | "google" = "decimal"
): string {
  if (coordinates === null) return "";

  const { lat, lng } = coordinates;

  switch (format) {
    case "decimal":
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    case "dms":
      return `${convertToDMS(lat, "lat")} ${convertToDMS(lng, "lng")}`;
    case "google":
      return `${lat},${lng}`;
    default:
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

/**
 * Converts decimal degrees to degrees, minutes, seconds format
 *
 * @param value The decimal degrees value
 * @param type Whether this is a latitude or longitude value
 * @returns A formatted DMS string
 */
function convertToDMS(value: number, type: "lat" | "lng"): string {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesNotTruncated);
  let seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  // Handle floating point precision issues
  const secondsWithPrecision = (minutesNotTruncated - minutes) * 60;
  if (Math.abs(secondsWithPrecision - Math.round(secondsWithPrecision)) < 0.000001) {
    seconds = Math.round(secondsWithPrecision);
  }

  // Handle case where seconds round to 60
  if (seconds >= 60) {
    seconds = 0;
    minutes += 1;
  }

  // Handle case where minutes reach 60
  if (minutes >= 60) {
    minutes = 0;
    // We don't need to handle degrees here as it's extremely unlikely with valid lat/lng values
  }

  const direction = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

  return `${degrees}°${minutes.toString().padStart(2, "0")}'${seconds.toString().padStart(2, "0")}"${direction}`;
}
