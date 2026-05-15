import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import type { MutatePromise } from "@raycast/utils";
import type { PaginatedResult } from "../api/common";

export type PaginatedCachedPromiseMutate<T> = MutatePromise<PaginatedResult<T>, PaginatedResult<T>>;

type UsePaginatedCachedPromiseOptions<T, Args extends readonly unknown[]> = {
  cacheKey: string;
  errorTitle: string;
  pageSize: number;
  args: Args;
  fetchPage: (page: number, ...args: Args) => Promise<PaginatedResult<T>>;
};

export function usePaginatedCachedPromise<T, Args extends readonly unknown[]>({
  cacheKey,
  errorTitle,
  pageSize,
  args,
  fetchPage,
}: UsePaginatedCachedPromiseOptions<T, Args>) {
  const argsKey = JSON.stringify(args);
  const [items, setItems] = useCachedState<T[]>(`${cacheKey}-items-${argsKey}`, []);
  const [page, setPage] = useCachedState<number>(`${cacheKey}-page-${argsKey}`, 1);
  const [hasMore, setHasMore] = useCachedState<boolean>(`${cacheKey}-hasMore-${argsKey}`, true);
  const initialData: PaginatedResult<T> = { items, hasMore };

  const { isLoading, revalidate, mutate } = useCachedPromise(
    async (nextPage: number, ...nextArgs: Args): Promise<PaginatedResult<T>> => fetchPage(nextPage, ...nextArgs),
    [page, ...args] as [number, ...Args],
    {
      keepPreviousData: true,
      initialData,
      onData: (data: PaginatedResult<T>) => {
        setHasMore(data.hasMore);
        if (page === 1) {
          setItems(data.items);
        } else if (data.items.length > 0) {
          setItems((previousItems) => [...previousItems, ...data.items]);
        }
      },
      onError(error) {
        showFailureToast(error, { title: errorTitle });
      },
    },
  );

  return {
    items,
    isLoading,
    revalidate,
    mutate,
    pagination: {
      pageSize,
      hasMore,
      onLoadMore: () => setPage((currentPage) => currentPage + 1),
    },
  } as const;
}
