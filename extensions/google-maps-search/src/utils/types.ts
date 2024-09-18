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
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: string;
  useSelected: boolean;
  saveSearchHistory: boolean;
}
