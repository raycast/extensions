import { useCachedState } from "@raycast/utils";
import { Dispatch, SetStateAction } from "react";
import { useCallbackSafeRef } from "./useCallbackSafeRef";

export type UseSyncCachedStateConfig = {
  cacheNamespace?: string;
};

const immediateDataMap: Record<string, { current: unknown }> = {};

/**
 * Similar to `useCachedState` only allows access to an up-to-date
 * version of the state when the hook updates multiple times in the
 * same react render frame
 *
 * @remark Be extra careful when using this hook - if you have
 * any asynchornous code the value in `current` may change.
 *
 * @param key - The unique identifier of the state. This can be used to share the state across components and/or commands.
 * @param initialState - The initial value of the state if there aren't any in the Cache yet.
 * @param config - Configuration object
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export const useSyncCachedState = <T extends unknown>(
  key: string,
  initialState: T,
  config?: UseSyncCachedStateConfig
): [currentStateRef: { readonly current: T }, setState: Dispatch<SetStateAction<T>>, safeState: T] => {
  const [cachedData, setCachedData] = useCachedState<T>(key, initialState, config);

  if (!immediateDataMap[key]) immediateDataMap[key] = { current: cachedData || initialState };

  const setData = useCallbackSafeRef<Dispatch<SetStateAction<T>>>((action: SetStateAction<T>) => {
    const data = typeof action === "function" ? (action as (value: T) => T)(cachedData) : action;
    if (!immediateDataMap[key]) immediateDataMap[key] = { current: data };
    immediateDataMap[key].current = data;
    setCachedData(data);
  });

  return [immediateDataMap[key] as { current: T }, setData, cachedData];
};
