import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";

// Mirrors @raycast/utils' (no longer exported) `FunctionReturningPromise` so this
// wrapper stays assignable to `usePromise`'s overloads. The `any` here matches the
// library's own signature, hence the targeted lint exception.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePromiseWithTimeout<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  args: Parameters<T>,
  timeout = 5000,
  defaultValue: Awaited<ReturnType<T>>,
) {
  const [result, setResult] = useState<Awaited<ReturnType<T>> | null>(null);
  const { isLoading, data, error } = usePromise(fn, args);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setResult(defaultValue);
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout, defaultValue]);

  useEffect(() => {
    if (data && !error) {
      setResult(data);
    }
  }, [data, error]);

  return { isLoading, data: result, error };
}
