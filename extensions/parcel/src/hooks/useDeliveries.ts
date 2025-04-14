import { useFetch } from "@raycast/utils";
import { getDeliveriesUrl, getAPIHeaders, ParcelApiResponse, FilterMode, getAPIError } from "../api";

export function useDeliveries(filterMode: FilterMode) {
  const { data, isLoading, error, revalidate } = useFetch<ParcelApiResponse>(getDeliveriesUrl(filterMode), {
    headers: getAPIHeaders(),
  });

  return {
    deliveries: data?.success ? data.deliveries : [],
    isLoading,
    error: error || (data ? getAPIError(data) : null),
    revalidate,
  };
}
