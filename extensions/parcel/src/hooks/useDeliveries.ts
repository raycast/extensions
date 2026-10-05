import { useFetch } from "@raycast/utils";
import { FilterMode, getAPIError, getAPIHeaders, getDeliveriesUrl, responseError } from "../api";
import { parseDeliveries, parseJson } from "../schemas";

export function useDeliveries(filterMode: FilterMode) {
  const { data, isLoading, error, revalidate } = useFetch(getDeliveriesUrl(filterMode), {
    headers: getAPIHeaders(),
    parseResponse: async (response) => {
      // Supplying `parseResponse` replaces the default, so this hook owns the status check.
      if (!response.ok) {
        throw await responseError(response, `Couldn't reach Parcel (${response.status})`);
      }
      return parseDeliveries(parseJson(await response.text()));
    },
  });

  return {
    deliveries: data?.success ? (data.deliveries ?? []) : [],
    isLoading,
    error: error || (data ? getAPIError(data) : null),
    revalidate,
  };
}
