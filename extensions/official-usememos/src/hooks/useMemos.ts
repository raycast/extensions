import { useCachedPromise } from "@raycast/utils";
import { buildMemoFilter, listMemos } from "../api/memo";
import { toErrorMessage } from "../helpers/errors";
import { getMemosConnection } from "../helpers/preferences";
import { useCurrentUser } from "./useCurrentUser";

export type MemoScope = "mine" | "all";

const PAGE_SIZE = 30;

export const useMemos = (scope: MemoScope, searchText: string) => {
  const currentUser = useCurrentUser();
  const creatorName = scope === "mine" ? currentUser.user?.name : undefined;
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(
    (text: string, creator: string | undefined) =>
      async ({ cursor }: { cursor?: string }) => {
        const filter = buildMemoFilter({ searchText: text, creator });
        const page = await listMemos(getMemosConnection(), { filter, pageToken: cursor, pageSize: PAGE_SIZE });
        return { data: page.memos, hasMore: page.nextPageToken != null, cursor: page.nextPageToken };
      },
    [searchText, creatorName],
    { keepPreviousData: true, execute: scope === "all" || creatorName != null, onError: () => undefined },
  );
  const failure = error ?? (scope === "mine" ? currentUser.error : undefined);
  return {
    memos: data ?? [],
    isLoading: isLoading || (scope === "mine" && currentUser.isLoading),
    errorMessage: failure == null ? undefined : toErrorMessage(failure),
    pagination,
    revalidate,
    currentUserName: currentUser.user?.name,
  };
};
