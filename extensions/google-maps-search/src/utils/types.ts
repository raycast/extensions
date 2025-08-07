import { Distance, Duration, TransportType } from "../types";

/**
 * Corresponds to Google Map's four possible modes of travel.
 */
export enum transportType {
  Cycling = "bicycling",
  Driving = "driving",
  Transit = "transit",
  Walking = "walking",
}

/**
 * Enum for origin options in the form
 */
export enum OriginOption {
  Home = "home",
  Custom = "custom",
}

/**
 * Sort order options for place results
 */
export type SortOrder = "none" | "distance" | "rating" | "price" | "price-desc";

/**
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: string;
  preferredOrigin: OriginOption;
  useSelected: boolean;
  saveSearchHistory: boolean;
  googlePlacesApiKey: string;
  showMapInSidebar: boolean;
  unitSystem: "metric" | "imperial";
  defaultSortOrder: SortOrder;
}

/**
 * Interface for place search results
 */
export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  photoReference?: string;
  vicinity?: string;
  priceLevel?: number;
}

/**
 * Interface for place details
 */
export interface PlaceDetails extends PlaceSearchResult {
  phoneNumber?: string;
  website?: string;
  openingHours?: {
    weekdayText?: string[];
    isOpen?: boolean;
  };
  reviews?: PlaceReview[];
  photos?: string[];
}

/**
 * Interface for place reviews
 */
export interface PlaceReview {
  authorName: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}

/**
 * Interface for route information
 */
export interface RouteInfo {
  distance: Distance;
  duration: Duration;
  startAddress: string;
  endAddress: string;
  steps: RouteStep[];
  polyline: string; // encoded polyline
}

/**
 * Interface for route steps
 */
export interface RouteStep {
  distance: Distance;
  duration: Duration;
  instructions: string;
  travelMode: TransportType;
  polyline: string; // encoded polyline
}

/**
 * Interface for place type options
 */
export interface PlaceTypeOption {
  title: string;
  value: string;
}

/**
 * Available place types for Google Places API
 */
export const PLACE_TYPES: PlaceTypeOption[] = [
  { title: "Restaurant", value: "restaurant" },
  { title: "Cafe", value: "cafe" },
  { title: "Bar", value: "bar" },
  { title: "Supermarket", value: "supermarket" },
  { title: "Bakery", value: "bakery" },
  { title: "Bank", value: "bank" },
  { title: "Gas Station", value: "gas_station" },
  { title: "Hospital", value: "hospital" },
  { title: "Pharmacy", value: "pharmacy" },
  { title: "Park", value: "park" },
  { title: "Gym", value: "gym" },
  { title: "School", value: "school" },
  { title: "Shopping Mall", value: "shopping_mall" },
  { title: "Movie Theater", value: "movie_theater" },
  { title: "Museum", value: "museum" },
  { title: "Hotel", value: "lodging" },
  { title: "Post Office", value: "post_office" },
  { title: "Library", value: "library" },
  { title: "Police", value: "police" },
  { title: "Airport", value: "airport" },
  { title: "Bus Station", value: "bus_station" },
  { title: "Train Station", value: "train_station" },
  { title: "Subway Station", value: "subway_station" },
  { title: "Tourist Attraction", value: "tourist_attraction" },
];
