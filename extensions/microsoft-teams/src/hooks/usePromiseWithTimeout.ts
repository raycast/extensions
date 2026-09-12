import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";

export function usePromiseWithTimeout<Arguments extends unknown[], Result>(
  fn: (...args: Arguments) => Promise<Result>,
  args: Arguments,
  timeout = 5000,
  defaultValue: Result,
) {
  const [result, setResult] = useState<Result | null>(null);
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
