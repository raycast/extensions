import { useFetch } from "@raycast/utils";

import { ApiBaseUrl, ApiHeaders } from "@/api/helpers";
import { ClientObject } from "@/types/client";
import { UseFetchOptions } from "@/types/utils";

type Props = {
  clientId: ClientObject["id"];
  options?: UseFetchOptions<ClientObject>;
};

export function useClient({ clientId, options }: Props) {
  const { data, error, isLoading, mutate } = useFetch<ClientObject>(`${ApiBaseUrl}/clients/${clientId}.json`, {
    headers: ApiHeaders,
    ...options,
  });

  return {
    clientData: data,
    clientError: error,
    clientIsLoading: isLoading,
    clientMutate: mutate,
  };
}
