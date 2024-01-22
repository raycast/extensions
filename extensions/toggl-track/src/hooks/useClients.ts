import { useCachedPromise } from "@raycast/utils";
import { getMyClients } from "../api";

export function useClients() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMyClients, [], { initialData: [] });
  return {
    clients: data,
    clientsError: error,
    isLoadingClients: isLoading,
    revalidateClients: revalidate,
  };
}
