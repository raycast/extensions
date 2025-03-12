/**
 * Given an origin, a destination, and a travel mode, returns a direction url according to the following specs:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * @param origin The origin address
 * @param destination The destination address
 * @param transporttype One of four possible transit types
 * @returns A properly URI encoded string according to Google Maps documentation
 */
export function makeDirectionsURL(origin: string, destination: string, transporttype: string): string {
  const mapsBase = "https://www.google.com/maps/dir/?api=1";
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
  return mapsBase + "&query=" + encodeURI(query);
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
 * Fetches coordinates for a given search query using Google Maps Geocoding API
 * Note: This requires an API key and makes an external API call
 *
 * @param query The search query
 * @returns A promise that resolves to an object with lat and lng properties or null if geocoding failed
 */
export async function getCoordinatesForQuery(): Promise<{ lat: number; lng: number } | null> {
  try {
    // This is a simplified implementation that doesn't use an actual API key
    // In a real implementation, you would need to:
    // 1. Add an API key preference in package.json
    // 2. Use that key in the API request
    // 3. Handle rate limiting and errors properly

    // For now, we'll use a fallback approach by constructing a Google Maps URL
    // and trying to extract coordinates from it

    // This is a placeholder for the actual API call
    // const apiKey = "YOUR_API_KEY"; // Should come from preferences
    // const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    // const response = await fetch(url);
    // const data = await response.json();
    //
    // if (data.results && data.results.length > 0) {
    //   const location = data.results[0].geometry.location;
    //   return {
    //     lat: location.lat,
    //     lng: location.lng
    //   };
    // }

    // Fallback method: Open the URL in a hidden iframe or use a headless browser
    // This is just a placeholder - this won't actually work in a Raycast extension
    // but illustrates the concept

    // For now, return null as we can't reliably get coordinates without an API key
    return null;
  } catch (error) {
    console.error("Error getting coordinates:", error);
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
  coordinates: { lat: number; lng: number },
  format: "decimal" | "dms" | "google" = "decimal"
): string {
  if (!coordinates) return "";

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
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}
