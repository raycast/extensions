import { requestGist } from "../util/gist-utils";
import { useCachedPromise } from "@raycast/utils";
import { perPage } from "../types/preferences";

export function useGists(tag: string) {
  return useCachedPromise(
    (tag: string) => async (options) => {
      const data = await requestGist(tag, options.page + 1, parseInt(perPage));
      const hasMore = data[data.length - 1] != options.lastItem && options.page < 50;
      return { data, hasMore };
    },
    [tag],
    {
      keepPreviousData: true,
    },
  );
}
