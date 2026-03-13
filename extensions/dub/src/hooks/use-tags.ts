import { useCachedPromise } from "@raycast/utils";
import { getAllTags } from "@/api";

export const useTags = () => {
  const {
    data: tags,
    isLoading,
    error,
    mutate,
  } = useCachedPromise(getAllTags, [], {
    initialData: [],
    failureToastOptions: { title: "❗ Failed to fetch tags" },
  });

  return { tags, mutate, isLoading: (!tags && !error) || isLoading, error };
};
