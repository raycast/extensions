import { getPreferenceValues } from "@raycast/api";
import { AddressComponents, Preferences } from "./types";

interface PlacesAutocompleteResponse {
  predictions: Array<{
    description: string;
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
    types: string[];
  }>;
  status: string;
  error_message?: string;
}

interface PlaceDetailsResponse {
  result: {
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    name?: string;
    place_id: string;
    types?: string[];
  };
  status: string;
  error_message?: string;
}

/**
 * Get address predictions from Google Places API
 */
export async function getAddressPredictions(
  query: string,
  userLocation?: { latitude: number; longitude: number },
): Promise<PlacesAutocompleteResponse | null> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.googleMapsPlatformApiKey) {
    console.log("Google Maps Platform API key not configured");
    return null;
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query,
    )}&types=address&key=${preferences.googleMapsPlatformApiKey}`;

    // Add location bias if user location is available
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      url += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`; // 50km radius
    }

    const response = await fetch(url);
    const data = (await response.json()) as PlacesAutocompleteResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching address predictions:", error);
    return null;
  }
}

/**
 * Get detailed place information including parsed address components
 */
export async function getPlaceDetails(placeId: string): Promise<AddressComponents | null> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.googleMapsPlatformApiKey) {
    console.log("Google Maps Platform API key not configured");
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,formatted_address,geometry,name&key=${preferences.googleMapsPlatformApiKey}`;

    const response = await fetch(url);
    const data = (await response.json()) as PlaceDetailsResponse;

    if (data.status !== "OK") {
      console.error("Place Details API error:", data.status, data.error_message);
      return null;
    }

    return parseAddressComponents(data.result);
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
}

/**
 * Parse Google Places API address components into a structured format
 */
function parseAddressComponents(placeResult: PlaceDetailsResponse["result"]): AddressComponents {
  const components: AddressComponents = {
    formattedAddress: placeResult.formatted_address,
    latitude: placeResult.geometry?.location?.lat,
    longitude: placeResult.geometry?.location?.lng,
  };

  if (!placeResult.address_components) {
    return components;
  }

  for (const component of placeResult.address_components) {
    const types = component.types;

    if (types.includes("street_number")) {
      components.streetNumber = component.long_name;
    } else if (types.includes("route")) {
      components.streetName = component.long_name;
    } else if (types.includes("locality")) {
      components.city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      components.state = component.short_name;
    } else if (types.includes("postal_code")) {
      components.postalCode = component.long_name;
    } else if (types.includes("country")) {
      components.country = component.short_name;
    }
  }

  return components;
}

/**
 * Enhanced address detection using Google Places API
 * Returns parsed address components if the query is detected as an address
 */
export async function detectAndParseAddress(
  query: string,
  userLocation?: { latitude: number; longitude: number },
): Promise<AddressComponents | null> {
  // First, do a quick regex check to see if it looks like an address
  // This pattern matches: number + street name (can be multiple words)
  // Examples: "123 Main St", "1028 Pleasant View Ave", "456 Oak Street Drive"
  const simpleAddressPattern = /^\d+\s+[a-zA-Z\s]+/i;
  if (!simpleAddressPattern.test(query.trim())) {
    return null;
  }

  // Get predictions from Places API
  const predictions = await getAddressPredictions(query, userLocation);

  if (!predictions || predictions.predictions.length === 0) {
    console.log("No predictions returned from Places API for query:", query);
    return null;
  }

  console.log(`Places API returned ${predictions.predictions.length} predictions for "${query}"`);

  // Check if the first prediction is actually an address type
  const firstPrediction = predictions.predictions[0];
  console.log("First prediction:", firstPrediction.description, "Types:", firstPrediction.types);

  const isAddress = firstPrediction.types.some((type) =>
    ["street_address", "route", "premise", "subpremise", "street_number"].includes(type),
  );

  if (!isAddress) {
    console.log("Not detected as address. Types were:", firstPrediction.types);
    return null;
  }

  console.log("Detected as address, fetching place details...");

  // Get detailed information for the first (most relevant) prediction
  const details = await getPlaceDetails(firstPrediction.place_id);

  return details;
}

/**
 * Check if a query appears to be location-based and could benefit from Places API
 */
export function isLocationBasedQuery(query: string): boolean {
  const locationKeywords = [
    "near me",
    "nearby",
    "closest",
    "nearest",
    "around here",
    "restaurant",
    "cafe",
    "coffee",
    "bar",
    "pub",
    "hotel",
    "store",
    "shop",
    "pharmacy",
    "hospital",
    "clinic",
    "bank",
    "atm",
    "gas station",
    "gym",
    "salon",
    "spa",
    "theater",
    "cinema",
    "museum",
    "park",
  ];

  const queryLower = query.toLowerCase();
  return locationKeywords.some((keyword) => queryLower.includes(keyword));
}

/**
 * Enhance a location-based query with user's location if not already present
 */
export function enhanceQueryWithLocation(query: string, userLocation: { city?: string; region?: string }): string {
  // Check if query already has location information
  if (query.includes(" in ") || query.includes(" near ") || query.includes(",")) {
    return query;
  }

  // Add location if available
  if (userLocation.city && userLocation.region) {
    return `${query} in ${userLocation.city}, ${userLocation.region}`;
  } else if (userLocation.city) {
    return `${query} in ${userLocation.city}`;
  }

  return query;
}

/**
 * Geocode any location query (city, address, landmark, etc.) using Places API
 * This is more general than detectAndParseAddress which requires street addresses
 */
export async function geocodeLocation(
  query: string,
  userLocation?: { latitude: number; longitude: number },
): Promise<AddressComponents | null> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.googleMapsPlatformApiKey) {
    console.log("Google Maps Platform API key not configured for geocoding");
    return null;
  }

  try {
    // Use Places Autocomplete without type restriction to handle any location
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query,
    )}&key=${preferences.googleMapsPlatformApiKey}`;

    // Add location bias if user location is available
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      url += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`; // 50km radius
    }

    const response = await fetch(url);
    const data = (await response.json()) as PlacesAutocompleteResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error for geocoding:", data.status, data.error_message);
      return null;
    }

    if (data.predictions && data.predictions.length > 0) {
      // Get the first prediction and fetch its details
      const firstPrediction = data.predictions[0];
      console.log("Geocoding result for", query, ":", firstPrediction.description);
      const details = await getPlaceDetails(firstPrediction.place_id);
      return details;
    }

    return null;
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}
