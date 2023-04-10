import { useEffect, useRef } from "react";

type Fn = (...args: unknown[]) => unknown;

export const useInterval = (callback: Fn, delay?: number | null) => {
  const savedCallback = useRef<Fn>(() => null);

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [delay]);
};
