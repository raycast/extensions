import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences } from "../types";
import { renderMap } from "../utils/mapRenderer";

// Maximum allowed map dimensions for the API
const MAX_MAP_WIDTH = 640;
const MAX_MAP_HEIGHT = 640;
const DEFAULT_MAP_SIZE = `${MAX_MAP_WIDTH}x${MAX_MAP_HEIGHT}`;

/**
 * Input type for the showPlacesOnMap tool
 */
export type ShowPlacesOnMapInput = {
  /**
   * A comma-separated list of place names or addresses to show on the map
   */
  places: string;

  /**
   * Optional center location for the map (address or place name)
   */
  center?: string;

  /**
   * Optional zoom level (1-20, where 1 is world view and 20 is building view)
   */
  zoom?: number;

  /**
   * Optional map size (width x height in pixels, max 640x640)
   */
  size?: string;

  /**
   * Whether to use colored markers with labels (A, B, C, etc.)
   */
  useColoredMarkers?: boolean;
};

/**
 * Tool for showing multiple places on a Google Maps interface
 */
export async function showPlacesOnMap(input: ShowPlacesOnMapInput): Promise<string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.googlePlacesApiKey) {
      return "Please set your Google Maps API key in preferences.";
    }

    console.log("Received places input:", input.places);

    // Parse the places list - use semicolons as the primary separator
    let placesList: string[] = [];

    // First try to split by semicolons (explicit address separators)
    const semicolonSplit = input.places
      .split(";")
      .map((place) => place.trim())
      .filter((place) => place.length > 0);

    if (semicolonSplit.length > 1) {
      placesList = semicolonSplit;
      console.log("Split by semicolons:", placesList);
    } else {
      // If no semicolons, try to intelligently split by commas
      // This is tricky because commas can be part of an address

      const commaSplit = input.places
        .split(",")
        .map((place) => place.trim())
        .filter((place) => place.length > 0);

      if (commaSplit.length > 1) {
        // Check if this looks like a list of place names (e.g., "Place A, Place B, Place C")
        // or a single address with commas (e.g., "123 Main St, City, State ZIP")

        // Addresses typically have numbers and specific patterns
        const hasAddressPattern = input.places.match(
          /\d+\s+[A-Za-z]+\s+(?:St|Ave|Blvd|Rd|Drive|Lane|Place|Court|Plaza|Square|Highway|Parkway)/i
        );

        // If it has an address pattern, it's likely a single address with commas
        if (hasAddressPattern) {
          placesList = [input.places.trim()];
          console.log("Detected address pattern, using as single place:", placesList);
        } else {
          // Otherwise, treat as separate place names
          placesList = commaSplit;
          console.log("Split by commas (place names):", placesList);
        }
      } else {
        // Just one item, use as is
        placesList = [input.places.trim()];
        console.log("Single place input:", placesList);
      }
    }

    if (placesList.length === 0) {
      return "Please provide at least one place to show on the map.";
    }

    // Default zoom level if not specified
    const zoom = input.zoom || 14;

    // Validate zoom level
    if (zoom < 1 || zoom > 20) {
      return "Zoom level must be between 1 and 20.";
    }

    // Validate map size if provided
    const size = input.size || DEFAULT_MAP_SIZE;
    if (size && !/^\d+x\d+$/.test(size)) {
      return `Map size must be in the format 'widthxheight', e.g., '${DEFAULT_MAP_SIZE}'.`;
    }
    // Check max dimensions (API limit: MAX_MAP_WIDTH x MAX_MAP_HEIGHT)
    const [widthStr, heightStr] = size.split("x");
    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);
    if (width > MAX_MAP_WIDTH || height > MAX_MAP_HEIGHT) {
      return `Map size cannot exceed ${MAX_MAP_WIDTH}x${MAX_MAP_HEIGHT} pixels.`;
    }

    console.log("Rendering map with places:", placesList);

    try {
      // Use the new map renderer utility with proper error handling
      const renderResult = await renderMap({
        places: placesList,
        center: input.center,
        zoom,
        size,
        useColoredMarkers: input.useColoredMarkers ?? true, // Default to true if not specified
        includeLink: true,
        altText: "Map of places",
      });

      // Validate the render result to prevent data format errors
      if (!renderResult || typeof renderResult !== "object") {
        console.error("Invalid render result:", renderResult);
        throw new Error("Map rendering failed with invalid data format");
      }

      const { markdown, successfulPlaces, failedPlaces } = renderResult;

      // Validate the markdown output
      if (!markdown || typeof markdown !== "string") {
        console.error("Invalid markdown in render result:", markdown);
        throw new Error("Map rendering produced invalid markdown");
      }

      // Validate the places arrays
      if (!Array.isArray(successfulPlaces) || !Array.isArray(failedPlaces)) {
        console.error("Invalid places arrays in render result:", { successfulPlaces, failedPlaces });
        throw new Error("Map rendering produced invalid place data");
      }

      // Check if we have any successful places
      if (successfulPlaces.length === 0) {
        return "Sorry, I couldn't find any of the specified places. Please try with more specific place names or addresses.";
      }

      // Create markdown response with the map image
      let response = `# Places on Map\n\n`;

      // Add the static map image using the markdown from renderMap
      response += `${markdown}\n\n`;

      // List the places shown on the map
      response += `## Places Shown\n\n`;
      successfulPlaces.forEach((place, index) => {
        if (place && typeof place === "object" && place.name) {
          response += `${index + 1}. ${place.name}\n`;
        }
      });

      // List the places that failed to geocode
      if (failedPlaces.length > 0) {
        response += `\n## Places Not Found\n\n`;
        response += `The following places couldn't be found on the map:\n\n`;
        failedPlaces.forEach((place, index) => {
          if (place && typeof place === "string") {
            response += `${index + 1}. ${place}\n`;
          }
        });
        response += `\nTry using more specific names or addresses for these places.\n`;
      }

      return response;
    } catch (renderError) {
      console.error("Error rendering map:", renderError);
      return `Error rendering map: ${
        renderError instanceof Error ? renderError.message : "Unknown error"
      }. Please try with different places or a different format.`;
    }
  } catch (error) {
    console.error("Error in showPlacesOnMap tool:", error);
    showFailureToast(error, { title: "Error Showing Places on Map", message: String(error) });
    return `Sorry, I encountered an error while trying to show the places on a map. ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

// Default export for Raycast compatibility
export default showPlacesOnMap;
