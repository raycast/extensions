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

/**
 * Given an origin, a destination, and a travel mode, returns a direction url according to the following specs:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * @param origin The origin address
 * @param destination The destination address
 * @param travelmode One of four possible travel modes
 * @returns A properly URI encoded string according to Google Maps documentation
 */
export function makeDirectionsURL(origin: string, destination: string, travelmode: string): string {
  const mapsBase = "https://www.google.com/maps/dir/?api=1";
  return (
    mapsBase +
    "&origin=" +
    encodeURI(origin) +
    "&destination=" +
    encodeURI(destination) +
    "&travelmode=" +
    encodeURI(travelmode)
  );
}

/**
 * Given a query string, returns search url according to the following specs:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * @param query The query address
 * @returns A properly URI encoded string according to Google Maps documentation
 */
export function makeSearchURL(query: string): string {
  const mapsBase = "https://www.google.com/maps/search/?api=1";
  return mapsBase + "&query=" + encodeURI(query);
}
