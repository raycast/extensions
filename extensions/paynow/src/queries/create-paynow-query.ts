import { useCachedPromise, type CachedPromiseOptions } from "@raycast/utils";
import { showPaynowError } from "../utils/show-paynow-error";
import { Paynow } from "../utils/paynow-api";
import { useMemo } from "react";
import { useStore } from "../providers/store-provider/store-provider";
import type { Store } from "../types/store.types";

export interface CreatePaynowQueryParams<TData, TArgs extends Array<unknown>> {
  queryKey: string;
  queryFn: (api: Paynow, ...args: TArgs) => Promise<TData>;
  options?: CachedPromiseOptions<
    (queryKey: string, store: Store | null, isLoading: boolean, ...args: TArgs) => Promise<TData | null>,
    TData | null
  >;
}

export const createPaynowQuery = <TData, TArgs extends Array<unknown>>({
  queryKey,
  queryFn,
  options,
}: CreatePaynowQueryParams<TData, TArgs>) => {
  return (...args: TArgs) => {
    const { store, isLoading } = useStore();

    const result = useCachedPromise(
      async (_queryKey: string, store: Store | null, isLoading: boolean, ...args: TArgs) => {
        try {
          if (!store || isLoading) {
            return null;
          }
          const api = new Paynow({ apiKey: store.apiKey, storeId: store.id });
          return await queryFn(api, ...args);
        } catch (error) {
          await showPaynowError(error);
          return null;
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
