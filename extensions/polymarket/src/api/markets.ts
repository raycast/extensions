import { Ticker } from "../features/markets/types";

/**
 * Parser for the Polymarket global `events` endpoint response.
 * Maps the standard array of `Ticker` objects and handles basic HTTP and JSON error shapes.
 *
 * @param response - The raw `Response` object returned from the native `fetch` call.
 * @returns {Promise<Ticker[]>} An array of polymorphic `Ticker` active events.
 * @throws {Error} If the HTTP response is not ok, or if the API returns an `{ error: string }` payload.
 */
export async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as Ticker[] | { error: string };

  if (!response.ok || "error" in json) {
    throw new Error("error" in json ? json.error : response.statusText);
  }

  return json as Ticker[];
}

/**
 * Parser for the Polymarket `public-search` keyword endpoint response.
 * The search API wraps events inside an `{ events: Ticker[] }` root object, unlike the standard `events` endpoint.
 *
 * @param response - The raw `Response` object from the search query.
 * @returns {Promise<Ticker[]>} An unwrapped array of matched `Ticker` events.
 * @throws {Error} If checking the response fails or an error is explicitly passed from the backend.
 */
export async function parseSearchResponse(response: Response) {
  const json = (await response.json()) as { events: Ticker[] } | { error: string };

  if (!response.ok || "error" in json) {
    throw new Error("error" in json ? json.error : response.statusText);
  }

  return json.events as Ticker[];
}
