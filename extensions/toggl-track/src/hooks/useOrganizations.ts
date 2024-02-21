import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMyOrganizations } from "../api";

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
