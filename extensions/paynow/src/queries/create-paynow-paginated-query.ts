import { useCachedPromise, type CachedPromiseOptions, type PaginationOptions } from "@raycast/utils";
import { useMemo } from "react";
import { useStore } from "../providers/store-provider/store-provider";
import type { Store } from "../types/store.types";
import { Paynow } from "../utils/paynow-api";
import { showPaynowError } from "../utils/show-paynow-error";

export interface CreatePaynowPaginatedQueryParams<TData, TArgs extends Array<unknown>> {
  queryKey: string;
  queryFn: (
    api: Paynow,
    options: PaginationOptions<TData[]>,
    ...args: TArgs
  ) => Promise<{
    data: TData[];
    hasMore?: boolean;
    cursor?: any;
  }>;
  options?: CachedPromiseOptions<
    (
      queryKey: string,
      store: Store | null,
      isLoading: boolean,
      ...args: TArgs
    ) => (options: PaginationOptions<TData[]>) => Promise<{ data: TData[]; hasMore?: boolean; cursor?: any }>,
    TData[]
  >;
}

export const createPaynowPaginatedQuery = <TData, TArgs extends Array<unknown>>({
  queryKey,
  queryFn,
  options,
}: CreatePaynowPaginatedQueryParams<TData, TArgs>) => {
  return (...args: TArgs) => {
    const { store, isLoading } = useStore();

    const result = useCachedPromise(
      (_queryKey: string, store: Store | null, isLoading: boolean, ...args: TArgs) =>
        async (options: PaginationOptions<TData[]>) => {
          try {
            if (!store || isLoading) {
              return { data: [] as TData[], hasMore: false, cursor: undefined };
            }
            const api = new Paynow({ apiKey: store.apiKey, storeId: store.id });
            return await queryFn(api, options, ...args);
          } catch (error) {
            await showPaynowError(error);
            return { data: [] as TData[], hasMore: false, cursor: undefined };
          }
        },
      [queryKey, store, isLoading, ...args],
      options,
    );

    return useMemo(
      () => ({
        ...result,
        isLoading: result.isLoading || isLoading,
      }),
      [isLoading, result],
    );
  };
};
