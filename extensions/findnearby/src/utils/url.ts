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
 * Given a location and query string, returns search url according to the following specs:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * @param location The location to search near (empty for current location)
 * @param query The place type or query to search for
 * @returns A properly URI encoded string according to Google Maps documentation
 */
export function makeSearchURL(location: string, query: string): string {
  const mapsBase = "https://www.google.com/maps/search/?api=1";
  // Format: query=[what]+in+[where] or just query=[what] for current location
  const searchQuery = location ? `${query}+in+${location}` : query;
  return mapsBase + "&query=" + encodeURI(searchQuery);
}

/**
 * TODO: can we get JSON format data from Gmap API,
 * so that we can directly list out ~10 options inside Raycast UI?
 */
