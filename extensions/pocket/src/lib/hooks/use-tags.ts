import { usePocketClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { uniq } from "lodash";

export function useTags() {
  const pocket = usePocketClient();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: tags, mutate } = useCachedPromise(async (key) => pocket.getTags(), ["tags"], {
    initialData: [],
    keepPreviousData: true,
  });

  // Update local cache to have created tag as an option when adding tags
  function registerTag(tag: string) {
    mutate(Promise.resolve(), {
      optimisticUpdate: (tags) => uniq([...tags, tag]),
      shouldRevalidateAfter: false,
    });
  }

  return { tags, registerTag };
}
