declare const dataTagSymbol: unique symbol;
type DataTag<TType, TValue> = TType & {
  [dataTagSymbol]: TValue;
};

declare const pageParamTagSymbol: unique symbol;
type PageParamTag<TType, TValue> = TType & {
  [pageParamTagSymbol]: TValue;
};

export function tagQueryKey<TData, TPageParam = unknown, TKey = unknown[]>(
  key: TKey,
): TKey & DataTag<TKey, TData> & PageParamTag<TKey, TPageParam>;
export function tagQueryKey(key: unknown[]) {
  return key;
}
