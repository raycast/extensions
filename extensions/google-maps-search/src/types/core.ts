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
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: TransportType;
  preferredOrigin: OriginOption;
  useSelected: boolean;
  saveSearchHistory: boolean;
  googlePlacesApiKey: string;
  showMapInSidebar: boolean;
  unitSystem: "metric" | "imperial";
}
