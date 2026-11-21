import { usePromise } from "@raycast/utils";
import { Tweet } from "./twitter";
import { clientV2, Fetcher, PaginatedResult } from "./twitterapi_v2";

export function refreshingFetcher(revalidate: () => Promise<unknown> | unknown): Fetcher {
  const refresh = async () => {
    clientV2.clearCache();
    await revalidate();
  };
  return { updateInline: refresh, refresh };
}

export function useTweetPage<T>(
  load: (arg: T, cursor?: string) => Promise<PaginatedResult<Tweet>>,
  arg: T,
  failureTitle: string,
) {
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    (value: T) => async (options: { cursor?: string }) => {
      const page = await load(value, options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [arg],
    { failureToastOptions: { title: failureTitle } },
  );

  return { tweets: data, error, isLoading, pagination, fetcher: refreshingFetcher(revalidate) };
}
