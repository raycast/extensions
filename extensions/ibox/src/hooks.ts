import { useState, useCallback } from "react";
import { AsyncStatus } from "./type";

// https://usehooks.com/useAsync/
export function useAsync<D>(asyncFunction: (params?: any) => any) {
  const [status, setStatus] = useState<AsyncStatus>(AsyncStatus.none);
  const [error, setError] = useState<Error | null>(null);
  const [value, setValue] = useState<D>();

  const execute = useCallback(
    (...args: any[]) => {
      reset();
      setStatus(AsyncStatus.pending);

      return asyncFunction(...args)
        .then((response: D) => {
          setValue(response);
          setStatus(AsyncStatus.success);
        })
        .catch((error: Error) => {
          setError(error);
          setStatus(AsyncStatus.error);
        });
    },

    [asyncFunction]
  );

  const reset = function () {
    setStatus(AsyncStatus.none);
    setValue(undefined);
    setError(null);
  };

  // useEffect

  return { status, error, value, execute, reset };
}
