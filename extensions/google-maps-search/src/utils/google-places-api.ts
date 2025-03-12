import { Client, PlaceInputType } from "@googlemaps/google-maps-services-js";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, PlaceSearchResult, PlaceDetails, RouteInfo } from "./types";
import { milesToKm, getUnitSystem, getDefaultRadius } from "./common";

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
  return preferences.googlePlacesApiKey;
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
  const apiKey = getApiKey();

  const response = await getClient().textSearch({
    params: {
      query,
      key: apiKey,
      ...(location && { location: `${location.lat},${location.lng}` }),
      ...(radius && { radius }),
    },
  });

  if (response.data.status !== "OK") {
    throw new Error(`Places API error: ${response.data.status}`);
  }

  return response.data.results.map((result) => ({
    placeId: result.place_id || "",
    name: result.name || "",
    address: result.formatted_address || "",
    location: {
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
    },
    types: result.types || [],
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    photoReference: result.photos?.[0]?.photo_reference,
    vicinity: result.vicinity,
    priceLevel: result.price_level,
    openNow: result.opening_hours?.open_now,
  }));
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

  if (response.data.status !== "OK") {
    throw new Error(`Place details API error: ${response.data.status}`);
  }

  const result = response.data.result;

  return {
    placeId,
    name: result.name || "",
    address: result.formatted_address || "",
    location: {
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
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
 * @returns The latitude and longitude
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = getApiKey();

  const response = await getClient().geocode({
    params: {
      address,
      key: apiKey,
    },
  });

  if (response.data.status !== "OK") {
    throw new Error(`Geocoding API error: ${response.data.status}`);
  }

  return response.data.results[0]?.geometry?.location || null;
}

/**
 * Get directions between two points
 * @param origin The starting point (address or coordinates)
 * @param destination The ending point (address or coordinates)
 * @param mode The travel mode
 * @returns The API response
 */
export async function getDirections(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
  mode: string
): Promise<RouteInfo | null> {
  try {
    const apiKey = getApiKey();

    // Format origin and destination
    const originStr = typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
    const destinationStr = typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`;

    const response = await getClient().directions({
      params: {
        origin: originStr,
        destination: destinationStr,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mode: mode as any, // Using any here is necessary for the Google Maps API
        key: apiKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        units: getUnitSystem() as any, // Using any here is necessary for the Google Maps API
      },
    });

    if (response.data.status !== "OK" || response.data.routes.length === 0) {
      return null;
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
        travelMode: step.travel_mode,
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
 * @returns The API response
 */
export async function getNearbyPlaces(
  location: { lat: number; lng: number },
  type: string,
  radius = parseInt(getDefaultRadius(), 10)
): Promise<PlaceSearchResult[]> {
  try {
    const apiKey = getApiKey();
    const unitSystem = getUnitSystem();

    // Convert radius to meters if using imperial units (input would be in miles)
    const radiusInMeters = unitSystem === "imperial" ? Math.round(milesToKm(radius) * 1000) : radius;

    const response = await getClient().placesNearby({
      params: {
        location: `${location.lat},${location.lng}`,
        radius: radiusInMeters,
        type: type as PlaceInputType,
        key: apiKey,
      },
    });

    if (response.data.status !== "OK") {
      throw new Error(`Nearby places API error: ${response.data.status}`);
    }

    return response.data.results.map((result) => ({
      placeId: result.place_id || "",
      name: result.name || "",
      address: result.vicinity || "",
      location: {
        lat: result.geometry?.location?.lat || 0,
        lng: result.geometry?.location?.lng || 0,
      },
      types: result.types || [],
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      photoReference: result.photos?.[0]?.photo_reference,
      vicinity: result.vicinity,
      priceLevel: result.price_level,
      openNow: result.opening_hours?.open_now,
    }));
  } catch (error) {
    console.error("Error getting nearby places:", error);
    throw error;
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

  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${centerStr}&zoom=${zoom}&size=600x300&scale=2&key=${apiKey}`;

  // Add markers
  if (markers && markers.length > 0) {
    markers.forEach((marker, index) => {
      const label = marker.label || String.fromCharCode(65 + index); // A, B, C, etc.
      url += `&markers=color:red%7Clabel:${label}%7C${marker.lat},${marker.lng}`;
    });
  }

  // Add path
  if (path) {
    url += `&path=enc:${path}`;
  }

  return url;
}
