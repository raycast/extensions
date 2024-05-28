import { getMyClients } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useClients() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyClients, [], { initialData: [] });
  return {
    clients: data,
    clientsError: error,
    isLoadingClients: isLoading,
    revalidateClients: revalidate,
  };
}
