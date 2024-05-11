import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";

export function usePromiseWithTimeout<T extends (...args: any[]) => Promise<R>, R>(
  fn: T,
  args: Parameters<T>,
  timeout = 5000,
  defaultValue: R
) {
  const [result, setResult] = useState<R | null>(null);
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
