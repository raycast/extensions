import { showFailureToast } from "@raycast/utils";
import { getApiKey } from "./googlePlacesApi";
import { geocodePlace } from "../hooks/useGeocoding";

/**
 * Options for rendering a map
 */
export interface RenderMapOptions {
  /**
   * Places to show on the map (strings will be geocoded)
   */
  places: Array<string | { lat: number; lng: number; label?: string }>;

  /**
   * Center of the map (optional, will be calculated from places if not provided)
   */
  center?: string | { lat: number; lng: number };

  /**
   * Zoom level (1-20, where 1 is world view and 20 is building view)
   */
  zoom?: number;

  /**
   * Map size (width x height in pixels)
   */
  size?: string;

  /**
   * Custom map URL (optional, will be generated if not provided)
   */
  mapUrl?: string;

  /**
   * Alt text for the map image
   */
  altText?: string;

  /**
   * Whether to include a clickable link to Google Maps
   */
  includeLink?: boolean;

  /**
   * Whether to use colored markers with labels (A, B, C, etc.)
   */
  useColoredMarkers?: boolean;
}

/**
 * Available marker colors for the static maps API
 */
export const MARKER_COLORS = ["red", "blue", "green", "purple", "orange", "yellow", "gray", "brown", "black", "white"];

/**
 * Maximum allowed URL length for Google Maps Static API
 */
export const MAX_URL_LENGTH = 16384;

/**
 * Type for geocode result
 */
interface GeocodedLocation {
  lat: number;
  lng: number;
}

/**
 * Helper function to check if a place was successfully geocoded
 * @param result The geocode result to validate
 * @returns True if the result contains valid coordinates
 */
function isValidGeocodeResult(result: GeocodedLocation | null): result is GeocodedLocation {
  if (!result) return false;

  // Check if coordinates are valid numbers
  if (typeof result.lat !== "number" || typeof result.lng !== "number") {
    return false;
  }

  // Check if coordinates are within valid range
  if (result.lat < -90 || result.lat > 90 || result.lng < -180 || result.lng > 180) {
    return false;
  }

  return true;
}

/**
 * Generates a static Google Maps image URL with multiple places
 * @param options Map rendering options
 * @returns Promise resolving to the static map URL
 */
export async function generateStaticMapUrl(options: RenderMapOptions): Promise<{
  url: string;
  successfulPlaces: Array<{ name: string; coords: { lat: number; lng: number } }>;
  failedPlaces: string[];
}> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      const errorMessage = "Google Maps API key is required. Please set it in the extension preferences.";
      showFailureToast(errorMessage, { title: "API Key Required" });
      throw new Error(errorMessage);
    }

    const mapSize = options.size || "600x400";
    const mapZoom = options.zoom || 15;
    const mapScale = 2; // Request higher resolution map (2x pixel density)
    const mapFormat = "png32"; // Use higher quality PNG format with full transparency

    // Validate input options
    if (!options.places || !Array.isArray(options.places) || options.places.length === 0) {
      console.error("Invalid places array:", options.places);
      throw new Error("Places array is required and must not be empty");
    }

    console.log("Generating map for places:", options.places);

    // Track which places were successfully added to the map
    // Using 'let' because successfulPlaces may be reassigned if URL length exceeds limits
    let successfulPlaces: Array<{ name: string; coords: { lat: number; lng: number } }> = [];
    const failedPlaces: string[] = [];

    // Base URL
    const staticMapUrl = "https://maps.googleapis.com/maps/api/staticmap?";

    // Add map size, format and scale
    let url = `${staticMapUrl}size=${mapSize}&format=${mapFormat}&scale=${mapScale}`;

    // Add map type
    url += "&maptype=roadmap";

    // Try to get center coordinates if provided
    let centerCoords: GeocodedLocation | null = null;

    if (options.center) {
      if (typeof options.center === "string") {
        centerCoords = await geocodePlace(options.center);
      } else if (
        options.center &&
        typeof options.center === "object" &&
        "lat" in options.center &&
        "lng" in options.center &&
        typeof options.center.lat === "number" &&
        typeof options.center.lng === "number"
      ) {
        centerCoords = options.center;
      } else {
        console.warn("Invalid center coordinates format:", options.center);
      }

      if (centerCoords) {
        const safeCenterCoords = `${centerCoords.lat.toFixed(6)},${centerCoords.lng.toFixed(6)}`;
        url += `&center=${safeCenterCoords}`;
      }
    }

    // Add markers for each place
    const markers: Array<{ lat: number; lng: number; label?: string }> = [];
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < options.places.length; i++) {
      const place = options.places[i];
      let placeCoords: GeocodedLocation | null = null;
      let placeName = "";

      try {
        if (typeof place === "string") {
          console.log(`Attempting to geocode place: "${place}"`);

          // Use the center parameter as a location bias for geocoding
          // This helps ensure that place names are geocoded near the specified center
          let locationBias: GeocodedLocation | string | undefined = options.center;

          // If we already have some successfully geocoded places, use the first one as a bias
          // This helps keep subsequent places near the first one
          if (successfulPlaces.length > 0 && !locationBias) {
            locationBias = successfulPlaces[0].coords;
            console.log(`Using first place as location bias: ${JSON.stringify(locationBias)}`);
          }

          placeCoords = await geocodePlace(place, { locationBias });
          placeName = place;

          if (!isValidGeocodeResult(placeCoords)) {
            console.warn(`Failed to geocode place: ${place}`);
            failedPlaces.push(place);
            continue;
          }

          console.log(`Successfully geocoded "${place}" to:`, placeCoords);

          // Add marker for this place
          markers.push({
            lat: placeCoords.lat,
            lng: placeCoords.lng,
            label: labels[i % labels.length],
          });

          // Add to successful places
          successfulPlaces.push({
            name: placeName,
            coords: placeCoords,
          });
        } else if (
          place &&
          typeof place === "object" &&
          "lat" in place &&
          "lng" in place &&
          typeof place.lat === "number" &&
          typeof place.lng === "number"
        ) {
          placeCoords = place;
          placeName = place.label || `Location (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)})`;

          // Add marker for this place
          markers.push({
            lat: placeCoords.lat,
            lng: placeCoords.lng,
            label: labels[i % labels.length],
          });

          // Add to successful places
          successfulPlaces.push({
            name: placeName,
            coords: placeCoords,
          });
        } else {
          console.warn("Invalid place format:", place);
          if (typeof place === "string") {
            failedPlaces.push(place);
          } else {
            failedPlaces.push("Invalid place format");
          }
        }
      } catch (error) {
        console.error(`Error processing place ${place}:`, error);
        if (typeof place === "string") {
          failedPlaces.push(place);
        } else {
          failedPlaces.push("Error processing place");
        }
      }
    }

    // Add markers to URL
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const color = options.useColoredMarkers ? MARKER_COLORS[i % MARKER_COLORS.length] : "red";
      const label = marker.label || "";

      // The Google Maps Static API requires URL-encoded parameters
      // The format should be: markers=color:red%7Clabel:A%7Clat,lng
      // Note: The pipe character | needs to be URL-encoded as %7C
      url += `&markers=color:${color}%7Clabel:${label}%7C${marker.lat.toFixed(6)},${marker.lng.toFixed(6)}`;
    }

    // Use the visible parameter to ensure all places are shown on the map
    // This is simpler than calculating a viewport and lets the API handle it
    if (successfulPlaces.length > 0) {
      // Add each place to the visible parameter
      const visiblePlaces = successfulPlaces.map(
        (place) => `${place.coords.lat.toFixed(6)},${place.coords.lng.toFixed(6)}`
      );

      // Add the visible parameter with all places
      url += `&visible=${visiblePlaces.join("%7C")}`;

      console.log("Using visible parameter to show all places");
    } else if (centerCoords) {
      // If no successful places, fall back to center and zoom
      url += `&center=${centerCoords.lat.toFixed(6)},${centerCoords.lng.toFixed(6)}`;
      url += `&zoom=${mapZoom}`;
    }

    // Add API key
    url += `&key=${apiKey}`;

    // Check URL length against the maximum allowed by the API
    if (url.length > MAX_URL_LENGTH) {
      console.warn(`Static map URL exceeds maximum length (${url.length} > ${MAX_URL_LENGTH})`);

      // Try to reduce the URL length by limiting the number of markers
      if (markers.length > 10) {
        console.log("Reducing number of markers to stay within URL length limit");

        // Start fresh with just the base parameters
        url = `${staticMapUrl}size=${mapSize}&format=${mapFormat}&scale=${mapScale}&maptype=roadmap`;

        // Only include the first 10 markers (or fewer if needed)
        const maxMarkers = Math.min(10, Math.floor((MAX_URL_LENGTH - url.length - apiKey.length - 50) / 100));
        const limitedMarkers = markers.slice(0, maxMarkers);
        const limitedSuccessfulPlaces = successfulPlaces.slice(0, maxMarkers);

        // Add the limited markers
        for (let i = 0; i < limitedMarkers.length; i++) {
          const marker = limitedMarkers[i];
          const color = options.useColoredMarkers ? MARKER_COLORS[i % MARKER_COLORS.length] : "red";
          const label = marker.label || "";
          url += `&markers=color:${color}%7Clabel:${label}%7C${marker.lat.toFixed(6)},${marker.lng.toFixed(6)}`;
        }

        // Recalculate visible parameter with limited markers
        if (limitedSuccessfulPlaces.length > 0) {
          const visiblePlaces = limitedSuccessfulPlaces.map(
            (place) => `${place.coords.lat.toFixed(6)},${place.coords.lng.toFixed(6)}`
          );
          url += `&visible=${visiblePlaces.join("%7C")}`;
        } else if (centerCoords) {
          url += `&center=${centerCoords.lat.toFixed(6)},${centerCoords.lng.toFixed(6)}&zoom=${mapZoom}`;
        }

        // Add API key
        url += `&key=${apiKey}`;

        console.log(`Reduced URL length to ${url.length} characters with ${limitedMarkers.length} markers`);

        // Update the failedPlaces array to include places that were removed due to URL length
        const removedPlaces = successfulPlaces.slice(maxMarkers);
        failedPlaces.push(...removedPlaces.map((p) => p.name));

        // Update the successfulPlaces array
        successfulPlaces = [...limitedSuccessfulPlaces];
      }
    }

    return { url, successfulPlaces, failedPlaces };
  } catch (error) {
    console.error("Error generating static map URL:", error);
    throw error;
  }
}

/**
 * Renders a map as a markdown image with optional clickable link
 * @param options Map rendering options
 * @returns Promise resolving to markdown string for the map
 */
export async function renderMap(options: RenderMapOptions): Promise<{
  markdown: string;
  successfulPlaces: Array<{ name: string; coords: { lat: number; lng: number } }>;
  failedPlaces: string[];
}> {
  try {
    const { url, successfulPlaces, failedPlaces } = await generateStaticMapUrl(options);
    const altText = options.altText || "Map";
    const mapUrl = options.mapUrl || getGoogleMapsUrl(successfulPlaces);

    console.log("Generated map URL:", url);
    console.log("Successful places:", successfulPlaces.length);
    console.log("Failed places:", failedPlaces.length);

    // Create markdown for the map image
    const markdown = options.includeLink !== false ? `[![${altText}](${url})](${mapUrl})` : `![${altText}](${url})`;

    return {
      markdown,
      successfulPlaces,
      failedPlaces,
    };
  } catch (error) {
    console.error("Error rendering map:", error);
    // Return a fallback response instead of throwing
    return {
      markdown: `*Map rendering failed: ${error instanceof Error ? error.message : "Unknown error"}*`,
      successfulPlaces: [],
      failedPlaces: Array.isArray(options.places)
        ? options.places.filter((p) => typeof p === "string").map((p) => p as string)
        : [],
    };
  }
}

/**
 * Generates a Google Maps URL for multiple places
 * @param places Array of places with names and coordinates
 * @returns Google Maps URL
 */
export function getGoogleMapsUrl(places: Array<{ name: string; coords?: { lat: number; lng: number } }>): string {
  if (places.length === 0) {
    return "https://www.google.com/maps";
  }

  if (places.length === 1) {
    // For a single place, use direct search or coordinates
    if (places[0].coords) {
      return `https://www.google.com/maps?q=${places[0].coords.lat},${places[0].coords.lng}`;
    } else {
      return `https://www.google.com/maps/search/${encodeURIComponent(places[0].name)}`;
    }
  }

  // For multiple places, create a search with all places
  const searchQuery = places.map((p) => p.name).join(" and ");
  return `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
}

/**
 * Renders a simple single-location map as markdown (convenience function)
 * @param location Location coordinates
 * @param zoom Zoom level (1-20)
 * @param includeLink Whether to include a clickable link to Google Maps
 * @param altText Alt text for the image
 * @param mapUrl Optional custom map URL for the clickable link
 * @returns Markdown string for the map
 */
export async function renderSingleLocationMap(
  location: { lat: number; lng: number } | string,
  zoom = 15,
  includeLink = true,
  altText = "Map",
  mapUrl?: string
): Promise<string> {
  let locationCoords: GeocodedLocation | null = null;

  if (typeof location === "string") {
    locationCoords = await geocodePlace(location);

    if (!locationCoords) {
      console.error(`Could not geocode location: ${location}`);
      return `> **Error:** Could not geocode location: ${location}\n\n`;
    }
  } else {
    locationCoords = location;
  }

  // Create a properly formatted and encoded map URL
  const safeCoords = `${locationCoords.lat.toFixed(6)},${locationCoords.lng.toFixed(6)}`;
  const defaultMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(safeCoords)}`;

  const result = await renderMap({
    places: [locationCoords],
    zoom,
    includeLink,
    altText,
    mapUrl: mapUrl || defaultMapUrl,
  });

  return result.markdown;
}
