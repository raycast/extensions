import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMyClients } from "../api";

export function useClients() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyClients, [], { initialData: [] });
  return {
    clients: data,
    clientsError: error,
    isLoadingClients: isLoading,
    revalidateClients: revalidate,
  };
}
