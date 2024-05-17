import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { FunctionReturningPromise, UnwrapReturn } from "@raycast/utils/dist/types";

export function usePromiseWithTimeout<T extends FunctionReturningPromise>(
  fn: T,
  args: Parameters<T>,
  timeout = 5000,
  defaultValue: UnwrapReturn<T>
) {
  const [result, setResult] = useState<UnwrapReturn<T> | null>(null);
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
