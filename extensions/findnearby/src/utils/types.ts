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
 * Corresponds to Google Map's four possible modes of travel.
 */
export enum PlaceType {
  Park = "park",
  Cafe = "cafe",
  Japan = "japanese resturant",
  Thai = "thai resturant",
}

/**
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: string;
  useSelected: boolean;
}
