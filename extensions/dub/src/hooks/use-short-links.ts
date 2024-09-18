import { useCachedPromise } from "@raycast/utils";
import { getAllShortLinks } from "@/api";

export const useShortLinks = () => {
  const {
    data: shortLinks,
    isLoading,
    error,
    mutate,
  } = useCachedPromise(getAllShortLinks, [], {
    initialData: [],
    failureToastOptions: { title: "❗ Failed to fetch short links" },
  });

  return { shortLinks, mutate, isLoading: (!shortLinks && !error) || isLoading, error };
};
