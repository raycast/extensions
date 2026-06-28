import { useFetch } from "@raycast/utils";

import { ApiHeaders, ApiUrls } from "@/api/helpers";
import { ProductObject } from "@/types/product";
import { ApiPaginatedResponse, Filters, UseFetchOptions } from "@/types/utils";

type Props = {
  filters?: Filters<ProductObject>;
  options?: UseFetchOptions<ApiPaginatedResponse<ProductObject[]>>;
};

export function useProducts(
  { filters, options }: Props = {
    filters: {
      limit: 100,
      offset: 0,
    },
  },
) {
  const endpoint = new URL(ApiUrls.products);
  Object.entries(filters ?? {}).forEach(([key, value]) => endpoint.searchParams.append(key, String(value)));

  const { data, error, isLoading, mutate } = useFetch<ApiPaginatedResponse<ProductObject[]>>(endpoint.href, {
    headers: ApiHeaders,
    ...options,
  });

  return {
    productsData: data?.entities,
    productsError: error,
    productsIsLoading: isLoading,
    productsMutate: mutate,
  };
}
