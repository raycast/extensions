import { useFetch } from "@raycast/utils";
import { StationsV2Response, TravelAdvice } from "./types";
import { getPreferenceValues } from "@raycast/api";

const PREF_NS_API_KEY = "ns-api-key";
const PREF_SEARCH_RESULT_LIMIT = "result-limit";

const BASE_URL = "https://gateway.apiportal.ns.nl";

/**
 * This function is used to search for stations.
 *
 * @param {string} q - The query string to search for stations.
 *
 * @return {Promise<StationsV2Response>} - A promise that resolves to the response of the station search.
 */
export function useStationSearch(q: string) {
  const limit = getPreferenceValues()[PREF_SEARCH_RESULT_LIMIT];
  return useFetch<StationsV2Response>(
    `${BASE_URL}/nsapp-stations/v2?includeNonPlannableStations=false&limit=${limit}&q=${encodeURIComponent(q)}`,
    {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        "Ocp-Apim-Subscription-Key": getPreferenceValues()[PREF_NS_API_KEY],
      },
      keepPreviousData: true,
    },
  );
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
