import { useCachedPromise } from "@raycast/utils";
import { getMyTags } from "../api";

export function useTags() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMyTags, [], { initialData: [] });
  return {
    tags: data,
    tagsError: error,
    isLoadingTags: isLoading,
    revalidateTags: revalidate,
  };
}
