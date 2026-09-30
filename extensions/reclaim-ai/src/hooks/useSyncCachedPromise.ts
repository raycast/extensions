import { useEffect } from "react";
import { useSyncCachedState, UseSyncCachedStateConfig } from "./useSyncCachedState";

/**
 * Options for `useSyncCachedPromise`
 */
export type UseSyncCachedPromiseOptions = UseSyncCachedStateConfig & {
  /**
   * `useSyncCachedPromise` will wrap any errors in a
   * generic `Error`.  Use this function to create your
   * own wrapper.
   * @param error The error raised by the promise
   */
  wrapError?: (error: unknown) => Error;
};

/**
 * Simplified version of `useCachedPromise` which will
 * prevent `fn` from running multiple times, even if
 * called from multiple components on the same react
 * render frame.
 * @param fn - A function which returns a data async
 * @param options - Options
 */
export const useSyncCachedPromise = <T>(
  key: string,
  fn: () => Promise<T>,
  options: UseSyncCachedPromiseOptions = {}
) => {
  const { wrapError = (cause) => new Error("Error in useSyncCachedPromise", { cause }), ...cacheConfig } = options;

  const [immediateData, setData, safeData] = useSyncCachedState<{
    readonly data: T | undefined;
    readonly isLoading: boolean;
    readonly error: Error | undefined;
  }>(
    key,
    {
      isLoading: false,
      data: undefined,
      error: undefined,
    },
    cacheConfig
  );

  useEffect(() => {
    if (!immediateData.current.isLoading)
      (async () => {
        setData({ ...immediateData.current, isLoading: true });
        try {
          const data = await fn();
          setData({ isLoading: false, data, error: undefined });
        } catch (cause) {
          const error = wrapError(cause);
          console.error(error);

          setData({
            isLoading: false,
            data: undefined,
            error,
          });
        }
      })();
  }, []);

  return safeData;
};
