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
  CurLoc = "curloc",
  Home = "home",
  Custom = "custom",
}

/**
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: string;
  preferredOrigin: OriginOption;
  useSelected: boolean;
  saveSearchHistory: boolean;
}
