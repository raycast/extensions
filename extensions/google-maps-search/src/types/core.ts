/**
 * Corresponds to Google Map's four possible modes of travel.
 */
export enum TransportType {
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
 * Reusable interface for geographic coordinates
 */
export interface GeoLocation {
  lat: number;
  lng: number;
}

/**
 * Sort order options for place results
 */
export type SortOrder = "none" | "distance" | "rating" | "price" | "price-desc";

/**
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  /**
   * Google Places API key used for all API calls
   */
  googlePlacesApiKey: string;
  homeAddress: string;
  preferredMode: TransportType;
  preferredOrigin: OriginOption;
  useSelected: boolean;
  saveSearchHistory: boolean;
  showMapInSidebar: boolean;
  unitSystem: "metric" | "imperial";
  defaultSortOrder: SortOrder;
}
