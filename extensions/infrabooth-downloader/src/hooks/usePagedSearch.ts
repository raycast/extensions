import { useCachedPromise } from "@raycast/utils";
import { handleError } from "../lib/feedback";
import { loadPage, ONLINE_KIND_TITLES, ONLINE_SEARCHES, type OnlineItems, type OnlineKind } from "../lib/onlineSearch";

function pagedSearch<K extends OnlineKind>(kind: K, query: string) {
  return (options: { page: number }) => loadPage<OnlineItems[K]>(ONLINE_SEARCHES[kind], query, options.page);
}

export function usePagedSearch<K extends OnlineKind>(kind: K, query: string) {
  const title = ONLINE_KIND_TITLES[kind];
  const { data, isLoading, pagination } = useCachedPromise(pagedSearch<K>, [kind, query], {
    onError: (error) => void handleError(error, `Loading ${title.toLowerCase()} failed`),
  });
  return { items: data ?? [], isLoading, pagination, title };
}
