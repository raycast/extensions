// External library imports
import {
  Client,
  PlaceInputType,
  GeocodeRequest,
  LatLngBounds,
  Status,
  TextSearchRequest,
  PlacesNearbyRequest,
  DirectionsRequest,
  TravelMode,
  UnitSystem,
} from "@googlemaps/google-maps-services-js";
import { getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences, PlaceSearchResult, PlaceDetails, RouteInfo, TransportType, PLACE_TYPES } from "../types";
import { getDefaultRadiusInPreferredUnit, getUnitSystem } from "./unitConversions";

// Initialize the Google Maps client
let client: Client | null = null;

/**
 * Get the Google Maps client instance
 * @returns The Google Maps client
 */
export function getClient(): Client {
  if (!client) {
    client = new Client({});
  }
  return client;
}

/**
 * Get the Google Places API key from preferences
 * @returns The API key
 */
export function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.googlePlacesApiKey;

  // Add validation and logging to help diagnose API key issues
  if (!apiKey || apiKey.trim() === "") {
    console.error("Google Places API key is missing or empty in preferences");
  } else if (apiKey.length < 20) {
    console.warn("Google Places API key appears to be invalid (too short)");
  }

  return apiKey;
}

/**
 * Perform a text search using the Google Places API
 * @param query The search query
 * @param location Optional location to search near
 * @param radius The search radius in meters
 * @returns Array of place search results
 */
export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number },
  radius?: number
): Promise<PlaceSearchResult[]> {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error("Google Places API key is required");
    }

    // Create properly typed params object
    const params: TextSearchRequest["params"] = {
      query,
      key: apiKey,
    };

    // Add optional parameters if provided
    if (location) {
      params.location = `${location.lat},${location.lng}`;
    }

    if (radius) {
      params.radius = radius;
    }

    const response = await getClient().textSearch({ params });

    if (response.data.status !== Status.OK && response.data.status !== Status.ZERO_RESULTS) {
      console.error(`Places API error: ${response.data.status}`);
      throw new Error(`Places API error: ${response.data.status}`);
    }

    // Return empty array for ZERO_RESULTS
    if (response.data.status === Status.ZERO_RESULTS) {
      return [];
    }

    if (!response.data.results || !Array.isArray(response.data.results)) {
      console.error("Invalid response format: results is not an array");
      throw new Error("Invalid response format from Google Places API");
    }

    return response.data.results.map((result) => {
      // Validate location data to prevent errors
      if (!result.geometry?.location?.lat || !result.geometry?.location?.lng) {
        console.error("Missing location data in result:", result.name);
        throw new Error(`Missing location data for "${result.name || "unknown place"}"`);
      }

      return {
        placeId: result.place_id || "",
        name: result.name || "",
        address: result.formatted_address || result.vicinity || "",
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        types: result.types || [],
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        photoReference: result.photos?.[0]?.photo_reference,
        vicinity: result.vicinity,
        priceLevel: result.price_level,
        openNow: result.opening_hours?.open_now,
      };
    });
  } catch (error) {
    console.error("Error searching for places:", error);
    return [];
  }
}

/**
 * Get details for a specific place using its place ID
 * @param placeId The Google Place ID
 * @returns Detailed place information
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const apiKey = getApiKey();

  const response = await getClient().placeDetails({
    params: {
      place_id: placeId,
      key: apiKey,
      fields: [
        "name",
        "formatted_address",
        "geometry",
        "types",
        "rating",
        "user_ratings_total",
        "photos",
        "formatted_phone_number",
        "website",
        "opening_hours",
        "reviews",
        "price_level",
        "vicinity",
      ],
    },
  });

  if (response.data.status !== Status.OK) {
    throw new Error(`Place details API error: ${response.data.status}`);
  }

  const result = response.data.result;

  if (!result.geometry?.location?.lat) throw new Error("Missing location latitude");
  if (!result.geometry?.location?.lng) throw new Error("Missing location longitude");

  return {
    placeId,
    name: result.name || "",
    address: result.formatted_address || "",
    location: {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    },
    types: result.types || [],
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    phoneNumber: result.formatted_phone_number,
    website: result.website,
    openingHours: {
      weekdayText: result.opening_hours?.weekday_text,
      isOpen: result.opening_hours?.open_now,
    },
    reviews: result.reviews?.map((review) => ({
      authorName: review.author_name,
      rating: review.rating,
      relativeTimeDescription: review.relative_time_description,
      text: review.text,
      time: Number(review.time), // Convert to number to match PlaceReview interface
    })),
    photos: result.photos?.map(
      (photo) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
    ),
    priceLevel: result.price_level,
    vicinity: result.vicinity,
  };
}

/**
 * Geocode an address to get its coordinates
 * @param address The address to geocode
 * @param locationBias Optional location to bias results toward (string address or coordinates)
 * @returns The latitude and longitude
 */
export async function geocodeAddress(
  address: string,
  locationBias?: string | { lat: number; lng: number }
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = getApiKey();

  if (!address.trim()) {
    console.warn("Empty address provided to geocodeAddress");
    return null;
  }

  try {
    // Create base params with proper typing
    const params: GeocodeRequest["params"] = {
      address,
      key: apiKey,
    };

    // Add location bias if provided
    if (locationBias) {
      if (typeof locationBias === "string") {
        // Use region bias if it's a string (typically a city or region name)
        const region = locationBias.split(",")[0].trim();
        params.region = region;
        console.log(`Geocoding "${address}" with region bias: ${region}`);
      } else {
        // Use bounds bias with coordinates
        const delta = 0.045; // Roughly 5km at equator
        const bounds: LatLngBounds = {
          northeast: { lat: locationBias.lat + delta, lng: locationBias.lng + delta },
          southwest: { lat: locationBias.lat - delta, lng: locationBias.lng - delta },
        };
        params.bounds = bounds;
        console.log(`Geocoding "${address}" with bounds bias`);
      }
    } else {
      console.log(`Geocoding "${address}" without bias`);
    }

    // Make the geocoding request
    const response = await getClient().geocode({ params });

    // Handle response based on status
    if (response.data.status === Status.OK) {
      const location = response.data.results[0]?.geometry?.location;
      if (location) {
        console.log(`Successfully geocoded "${address}" to:`, location);
        return location;
      }
    } else if (response.data.status === Status.ZERO_RESULTS) {
      console.log(`No geocoding results found for address: ${address}`);
    } else {
      console.error(`Geocoding API error: ${response.data.status} for address: ${address}`);
    }

    return null;
  } catch (error) {
    console.error(`Error during geocoding for address ${address}:`, error);
    return null;
  }
}

/**
 * Get directions between two points
 * @param origin The starting point (address or coordinates)
 * @param destination The ending point (address or coordinates)
 * @param mode The travel mode (driving, walking, bicycling, or transit)
 * @returns The API response
 * @throws Error if the API request fails
 */
export async function getDirections(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
  mode: TransportType
): Promise<RouteInfo | null> {
  try {
    const apiKey = getApiKey();

    // Format origin and destination
    const originStr = typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
    const destinationStr = typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`;

    // Get validated travel mode and unit system
    // Cast TransportType to TravelMode since they have the same values
    const travelMode = mode as unknown as TravelMode;
    const unitSystem = getUnitSystem() === "metric" ? "metric" : "imperial";

    // Create properly typed params object
    const params: DirectionsRequest["params"] = {
      origin: originStr,
      destination: destinationStr,
      mode: travelMode as TravelMode,
      key: apiKey,
      units: unitSystem as UnitSystem,
    };

    const response = await getClient().directions({ params });

    if (response.data.status !== Status.OK || response.data.routes.length === 0) {
      throw new Error(`Directions API error: ${response.data.status || "No routes found"}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    // The API will return distances in the requested unit system
    // but we'll also store the raw values for potential conversion
    return {
      distance: leg.distance,
      duration: leg.duration,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      steps: leg.steps.map((step) => ({
        distance: step.distance,
        duration: step.duration,
        instructions: step.html_instructions,
        travelMode: step.travel_mode.toLowerCase() as TransportType,
        polyline: step.polyline.points,
      })),
      polyline: route.overview_polyline.points,
    };
  } catch (error) {
    console.error("Error getting directions:", error);
    return null;
  }
}

/**
 * Get nearby places based on a location and place type
 * @param location The location to search near
 * @param type The type of place to search for
 * @param radiusInMeters The search radius in meters
 * @param openNow Whether to only return places that are currently open
 * @returns The API response
 */
export async function getNearbyPlaces(
  location: { lat: number; lng: number },
  type: string,
  radius = getDefaultRadiusInPreferredUnit(),
  openNow = false
): Promise<PlaceSearchResult[]> {
  try {
    const apiKey = getApiKey();
    const unitSystem = getUnitSystem();

    // Convert radius to meters if using imperial units (input would be in miles)
    // The input radius is in the user's selected unit (miles or km), but the API expects meters
    let radiusInMeters = radius;

    if (unitSystem === "imperial") {
      // If using imperial, convert miles to meters (1 mile = 1609.34 meters)
      radiusInMeters = Math.round(radius * 1609.34);
    } else {
      // If using metric, convert km to meters
      radiusInMeters = Math.round(radius * 1000);
    }

    // Ensure the radius doesn't exceed Google's maximum of 50,000 meters
    radiusInMeters = Math.min(radiusInMeters, 50000);

    // Validate the place type
    const validPlaceTypes = new Set(PLACE_TYPES.map((placeType) => placeType.value as PlaceInputType));
    if (!validPlaceTypes.has(type as PlaceInputType)) {
      console.warn(`Invalid place type: ${type}. This may cause the API request to fail.`);
    }

    // Create properly typed params object
    const params: PlacesNearbyRequest["params"] = {
      location: `${location.lat},${location.lng}`,
      radius: radiusInMeters,
      type: type as PlaceInputType,
      key: apiKey,
    };

    // Add openNow parameter if requested
    if (openNow) {
      params.opennow = true;
    }

    const response = await getClient().placesNearby({ params });

    if (response.data.status !== Status.OK && response.data.status !== Status.ZERO_RESULTS) {
      console.error(`Nearby places API error: ${response.data.status}`);
      return [];
    }

    if (!response.data.results || !Array.isArray(response.data.results)) {
      console.error("Invalid response format: results is not an array");
      return [];
    }

    // Return empty array for ZERO_RESULTS
    if (response.data.status === Status.ZERO_RESULTS) {
      return [];
    }

    return response.data.results.map((result) => {
      // Validate location data to prevent errors
      if (!result.geometry?.location?.lat || !result.geometry?.location?.lng) {
        throw new Error(`Missing location data in result: ${result.name}`);
      }

      return {
        placeId: result.place_id || "",
        name: result.name || "",
        address: result.vicinity || "",
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        types: result.types || [],
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        photoReference: result.photos?.[0]?.photo_reference,
        vicinity: result.vicinity,
        priceLevel: result.price_level,
        openNow: result.opening_hours?.open_now,
      };
    });
  } catch (error) {
    console.error("Error getting nearby places:", error);
    return [];
  }
}

/**
 * Get a static map image URL for a location or route
 * @param center The center of the map (coordinates or place ID)
 * @param zoom The zoom level
 * @param markers Optional array of markers to display on the map
 * @param path Optional encoded polyline path to display on the map
 * @returns The static map image URL
 */
export function getStaticMapUrl(
  center: { lat: number; lng: number } | string,
  zoom = 15,
  markers?: Array<{ lat: number; lng: number; label?: string }>,
  path?: string
): string {
  const apiKey = getApiKey();
  const centerStr = typeof center === "string" ? center : `${center.lat},${center.lng}`;

  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
    centerStr
  )}&zoom=${zoom}&size=600x300&scale=2&key=${apiKey}`;

  // Add markers
  if (markers && markers.length > 0) {
    markers.forEach((marker, index) => {
      const label = encodeURIComponent(marker.label || String.fromCharCode(65 + index)); // A, B, C, etc.
      const lat = encodeURIComponent(marker.lat);
      const lng = encodeURIComponent(marker.lng);
      url += `&markers=color:red%7Clabel:${label}%7C${lat},${lng}`;
    });
  }

  // Add path
  if (path) {
    url += `&path=enc:${path}`;
  }

  return url;
}
