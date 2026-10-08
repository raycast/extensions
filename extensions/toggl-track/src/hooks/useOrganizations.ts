import { getMyOrganizations } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useOrganizations() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyOrganizations, [], {
    initialData: [],
  });
  return {
    organizations: data,
    organizationsError: error,
    isLoadingOrganizations: isLoading,
    revalidateOrganizations: revalidate,
  };
}
