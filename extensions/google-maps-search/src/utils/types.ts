export enum orginOption {
  CurLoc = "",
  Home = "home",
  Custom = "custom",
}

/**
 * Corresponds to Google Map's four possible modes of travel.
 */
export enum TravelMode {
  Driving = "driving",
  Walking = "walking",
  Bicycling = "bicycling",
  Transit = "transit",
}

/**
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: string;
}
