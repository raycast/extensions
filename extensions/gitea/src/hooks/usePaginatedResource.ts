import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type { MutatePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import type { PaginatedResult } from "../services";

type PaginatedResourceData<T> = {
  page: number;
  paramsKey: string;
  result: PaginatedResult<T>;
};

export type PaginatedResourceMutate<T> = MutatePromise<PaginatedResourceData<T>, PaginatedResourceData<T>>;

type Serializable = string | number | boolean | null | undefined | Serializable[] | { [key: string]: Serializable };
type SerializableRecord = Record<string, Serializable>;

type UsePaginatedResourceOptions<T, Params extends SerializableRecord> = {
  cacheKey: string;
  errorTitle: string;
  pageSize: number;
  params: Params;
  fetchPage: (params: Params & { page: number; limit: number }) => Promise<PaginatedResult<T>>;
};

export function usePaginatedResource<T, Params extends SerializableRecord>({
  cacheKey,
  errorTitle,
  pageSize,
  fetchPage,
  params,
}: UsePaginatedResourceOptions<T, Params>) {
  const paramsKey = stableStringify(params);
  const latestParamsKey = useRef(paramsKey);
  latestParamsKey.current = paramsKey;

  const [itemsByParamsKey, setItemsByParamsKey] = useState<{ key: string; items: T[] }>({ key: paramsKey, items: [] });
  const [hasMoreByParamsKey, setHasMoreByParamsKey] = useState<{ key: string; hasMore: boolean }>({
    key: paramsKey,
    hasMore: true,
  });
  const [pageState, setPageState] = useState<{ paramsKey: string; page: number }>({ paramsKey, page: 1 });

  const page = pageState.paramsKey === paramsKey ? pageState.page : 1;
  const items = itemsByParamsKey.key === paramsKey ? itemsByParamsKey.items : [];
  const hasMore = hasMoreByParamsKey.key === paramsKey ? hasMoreByParamsKey.hasMore : true;

  const initialData: PaginatedResourceData<T> = {
    page,
    paramsKey,
    result: { items, hasMore },
  };

  const { isLoading, revalidate, mutate } = useCachedPromise(
    async (_cacheKey: string, nextPage: number, nextParamsKey: string): Promise<PaginatedResourceData<T>> => {
      const result = await fetchPage({ ...params, page: nextPage, limit: pageSize });
      return { page: nextPage, paramsKey: nextParamsKey, result };
    },
    [cacheKey, page, paramsKey] as const,
    {
      keepPreviousData: true,
      initialData,
      onData: (data: PaginatedResourceData<T>) => {
        if (data.paramsKey !== latestParamsKey.current) {
          return;
        }

        setPageState({ paramsKey: data.paramsKey, page: data.page });
        setHasMoreByParamsKey({ key: data.paramsKey, hasMore: data.result.hasMore });
        setItemsByParamsKey((previous) => {
          if (data.page > 1 && previous.key !== data.paramsKey) {
            return previous;
          }

          const previousItems = previous.key === data.paramsKey ? previous.items : [];
          return {
            key: data.paramsKey,
            items: data.page === 1 ? data.result.items : [...previousItems, ...data.result.items],
          };
        });
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
    pagination: useMemo(
      () => ({
        pageSize,
        hasMore,
        onLoadMore: () => {
          setPageState((current) => ({
            paramsKey,
            page: current.paramsKey === paramsKey ? current.page + 1 : 1,
          }));
        },
      }),
      [hasMore, pageSize, paramsKey],
    ),
  } as const;
}

function stableStringify(value: Serializable): string {
  return JSON.stringify(sortSerializable(value));
}

function sortSerializable(value: Serializable): Serializable {
  if (Array.isArray(value)) {
    return value.map(sortSerializable);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, Serializable>>((result, key) => {
      result[key] = sortSerializable(value[key]);
      return result;
    }, {});
}
