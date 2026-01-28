import { useFetch } from "@raycast/utils";

import { ApiHeaders, ApiUrls } from "@/api/helpers";
import { ClientObject } from "@/types/client";
import { ApiPaginatedResponse, Filters, UseFetchOptions } from "@/types/utils";

type Props = {
  filters?: Filters<ClientObject>;
  options?: UseFetchOptions<ApiPaginatedResponse<ClientObject[]>>;
};

export function useClients(
  { filters, options }: Props = {
    filters: {
      limit: 100,
      offset: 0,
    },
  },
) {
  const endpoint = new URL(ApiUrls.clients);
  Object.entries(filters ?? {}).forEach(([key, value]) => endpoint.searchParams.append(key, String(value)));

  const { data, error, isLoading, mutate } = useFetch<ApiPaginatedResponse<ClientObject[]>>(endpoint.href, {
    headers: ApiHeaders,
    ...options,
  });

  return {
    clientsData: data?.entities,
    clientsError: error,
    clientsIsLoading: isLoading,
    clientsMutate: mutate,
  };
}
