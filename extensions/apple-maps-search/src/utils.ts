/**
 * Corresponds to Apple Map's four possible modes of travel.
 */
export enum TravelMode {
  Driving = "d",
  Walking = "w",
  Transit = "r",
  Cycling = "c",
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
 * https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
 *
 * @param origin The origin address
 * @param destination The destination address
 * @param travelmode One of three possible travel modes
 * @returns A properly URI encoded string according to Apple Maps documentation
 */
export function makeDirectionsURL(origin: string, destination: string, travelmode: string): string {
  const mapsBase = "maps://";
  return (
    mapsBase + "?saddr=" + encodeURI(origin) + "&daddr=" + encodeURI(destination) + "&dirflg=" + encodeURI(travelmode)
  );
}

/**
 * Given a query string, returns search url according to the following specs:
 * https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
 *
 * @param query The query address
 * @returns A properly URI encoded string according to Apple Maps documentation
 */
export function makeSearchURL(query: string): string {
  const mapsBase = "maps://";
  return mapsBase + "?q=" + encodeURI(query);
}
