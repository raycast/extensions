import type { UseInfiniteQueryOptions, UseQueryOptions, QueryKey } from "@tanstack/react-query";

export type HookQueryOptions<TQueryFnData, TSelect = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = Omit<
  Partial<UseQueryOptions<TQueryFnData, Error, TSelect, TQueryKey>>,
  "queryKey" | "queryFn" | "select"
>;

export type HookInfiniteQueryOptions<
  TQueryFnData,
  TSelect = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = { offset: number; limit: number },
> = Omit<
  Partial<UseInfiniteQueryOptions<TQueryFnData, Error, TSelect, TQueryKey, TPageParam>>,
  "queryKey" | "queryFn" | "select" | "initialPageParam" | "getNextPageParam"
>;
