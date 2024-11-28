import { useFetch } from "@raycast/utils";

import { ApiHeaders, ApiUrls } from "@/api/helpers";
import { ApiPaginatedResponse, Filters, UseFetchOptions } from "@/types/utils";
import { VatRateObject } from "@/types/vat_rate";

type Props = {
  filters?: Filters<VatRateObject>;
  options?: UseFetchOptions<ApiPaginatedResponse<VatRateObject[]>>;
};

export function useVatRates(
  { filters, options }: Props = {
    filters: {
      limit: 100,
      offset: 0,
    },
  },
) {
  const endpoint = new URL(ApiUrls.vat_rates);
  Object.entries(filters ?? {}).forEach(([key, value]) => endpoint.searchParams.append(key, String(value)));

  const { data, error, isLoading, mutate } = useFetch<ApiPaginatedResponse<VatRateObject[]>>(endpoint.href, {
    headers: ApiHeaders,
    ...options,
  });

  return {
    vatRatesData: data?.entities,
    vatRatesError: error,
    vatRatesIsLoading: isLoading,
    vatRatesMutate: mutate,
  };
}
