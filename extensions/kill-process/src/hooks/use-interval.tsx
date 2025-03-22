import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(noop);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    savedCallback.current();
    const refreshEnabled = (delay ?? 0) > 0;
    if (refreshEnabled) {
      const interval = Math.max(delay ?? 0, 1000);
      const id = setInterval(() => savedCallback.current(), interval);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default useInterval;
