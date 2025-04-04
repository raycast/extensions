import { getMyTags } from "@/api";
import { useSafeCachedPromise } from "@/hooks/toggl/useSafeCachedPromise";

export function useTags() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyTags, [], { initialData: [] });
  return {
    tags: data,
    tagsError: error,
    isLoadingTags: isLoading,
    revalidateTags: revalidate,
  };
}
