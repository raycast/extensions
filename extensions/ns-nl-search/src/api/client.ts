import { useFetch } from "@raycast/utils";
import { StationsV2Response, TravelAdvice } from "./types";
import { getPreferenceValues } from "@raycast/api";

const PREF_NS_API_KEY = "ns-api-key";

const BASE_URL = "https://gateway.apiportal.ns.nl";

/**
 * Fetches the full list of plannable stations (~800 entries) in one request.
 * An empty `q` makes the API return every station and ignore `limit`.
 * The result is cached by useFetch, so later launches render instantly from
 * cache and revalidate in the background. Filtering happens locally in the
 * dropdown, which also works in launchers without live dropdown search.
 */
export function useStations() {
  return useFetch<StationsV2Response>(`${BASE_URL}/nsapp-stations/v2?includeNonPlannableStations=false&q=`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": getPreferenceValues()[PREF_NS_API_KEY],
    },
  });
}

/**
 * Search for trips using the given parameters.
 *
 * @param {string} from - The starting location of the trip.
 * @param {string} to - The destination of the trip.
 * @param {string} date - The date of the trip.
 * @param {boolean} arrival - Determines if the trip is for arrival or departure.
 * @return {Promise<TravelAdvice>} A Promise that resolves to the response containing the trips.
 */
export function useTripSearch(from: string, to: string, date: string, arrival: boolean) {
  const params = new URLSearchParams();
  params.set("originUicCode", from);
  params.set("destinationUicCode", to);
  params.set("dateTime", date);
  params.set("searchForArrival", String(arrival));

  return useFetch<TravelAdvice>(`${BASE_URL}/reisinformatie-api/api/v3/trips?${params.toString()}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": getPreferenceValues()[PREF_NS_API_KEY],
    },
  });
}
