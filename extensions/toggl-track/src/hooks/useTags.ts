import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMyTags } from "../api";

export function useTags() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyTags, [], { initialData: [] });
  return {
    tags: data,
    tagsError: error,
    isLoadingTags: isLoading,
    revalidateTags: revalidate,
  };
}
