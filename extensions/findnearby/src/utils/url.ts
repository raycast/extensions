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
export function makeSearchURL(origin: string, query: string): string {
  const mapsBase = "https://www.google.com/maps/search/?api=1";
  return mapsBase + "&origin=" + encodeURI(origin) + "&query=" + encodeURI(query);
}

/**
 * TODO: can we get JSON format data from Gmap API,
 * so that we can directly list out ~10 options inside Raycast UI?
 */
