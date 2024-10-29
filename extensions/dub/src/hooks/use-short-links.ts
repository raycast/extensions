import { useCachedPromise } from "@raycast/utils";
import { getAllShortLinks } from "@/api";

export const useShortLinks = (query: string = "") => {
  const {
    data: data,
    isLoading,
    error,
    mutate,
  } = useCachedPromise(getAllShortLinks, [query], {
    initialData: { links: [], hasMoreLinks: false },
    failureToastOptions: { title: "❗ Failed to fetch short links" },
  });

  return { 
    shortLinks: data?.links, 
    mutate, isLoading: (!data?.links && !error) || isLoading, 
    error,
    supportsLinkTypeahead: query.trim().length > 0 || data?.hasMoreLinks,
  };
};
