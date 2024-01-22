import { usePocketClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";

export function useTags() {
  const pocket = usePocketClient();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: tags, mutate: refreshTags } = useCachedPromise(async (key) => pocket.getTags(), ["tags"], {
    initialData: [],
    keepPreviousData: true,
  });

  return {
    tags,
    refreshTags,
  };
}
