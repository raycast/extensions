import { useCachedPromise } from "@raycast/utils";
import { getUsedAliases } from "../services/cf/rules";

export function useAliases() {
  const {
    data: aliases,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(getUsedAliases, [], {
    keepPreviousData: true,
    initialData: [],
    failureToastOptions: {
      title: "Failed to Load Aliases",
      message: "There was an error loading your email aliases. Please check your API configuration and try again.",
    },
  });

  return {
    aliases,
    error,
    isLoading,
    revalidate,
  };
}
