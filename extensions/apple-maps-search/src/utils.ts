/**
 * Corresponds to Apple Map's four possible modes of travel.
 */
export enum TransportType {
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
 * @param transportType One of four possible travel modes
 * @returns A properly URI encoded string according to Apple Maps documentation
 */
export function makeDirectionsURL(origin: string, destination: string, transportType: string): string {
  const mapsBase = "maps://";
  return (
    mapsBase +
    "?saddr=" +
    encodeURI(origin) +
    "&daddr=" +
    encodeURI(destination) +
    "&dirflg=" +
    encodeURI(transportType)
  );
}

/**
 * Given an origin, a destination, and a travel mode, returns a web-based Apple Maps direction url
 *
 * @param origin The origin address
 * @param destination The destination address
 * @param transportType One of four possible travel modes
 * @returns A properly URI encoded web URL for Apple Maps directions
 */
export function makeWebDirectionsURL(origin: string, destination: string, transportType: string): string {
  const mapsBase = "https://maps.apple.com/";
  return (
    mapsBase +
    "?saddr=" +
    encodeURI(origin) +
    "&daddr=" +
    encodeURI(destination) +
    "&dirflg=" +
    encodeURI(transportType)
  );
}

/**
 * Platform-aware directions URL generator that uses app URLs on macOS and web URLs on other platforms
 *
 * @param origin The origin address
 * @param destination The destination address
 * @param transportType One of four possible travel modes
 * @returns A properly URI encoded string for the appropriate platform
 */
export function makePlatformDirectionsURL(origin: string, destination: string, transportType: string): string {
  const isMacOS = process.platform === "darwin";
  return isMacOS
    ? makeDirectionsURL(origin, destination, transportType)
    : makeWebDirectionsURL(origin, destination, transportType);
}

/**
 * Platform-aware search URL generator that uses app URLs on macOS and web URLs on other platforms
 *
 * @param query The query address
 * @returns A properly URI encoded string for the appropriate platform
 */
export function makePlatformSearchURL(query: string): string {
  const isMacOS = process.platform === "darwin";
  return isMacOS ? makeSearchURL(query) : makeWebSearchURL(query);
}

/**
 * Given a query string, returns search url according to the following specs:
 * https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
 *
 * @param query The query address
 * @returns A properly URI encoded string according to Apple Maps documentation
 */
export function makeSearchURL(query: string): string {
  if (!query || typeof query !== "string") {
    throw new Error("Query must be a non-empty string");
  }
  const mapsBase = "maps://";
  return mapsBase + "?q=" + encodeURI(query);
}

/**
 * Given a query string, returns a web-based Apple Maps search url
 *
 * @param query The query address
 * @returns A properly URI encoded web URL for Apple Maps
 */
export function makeWebSearchURL(query: string): string {
  if (!query || typeof query !== "string") {
    throw new Error("Query must be a non-empty string");
  }
  const mapsBase = "https://maps.apple.com/";
  return mapsBase + "?q=" + encodeURI(query);
}
