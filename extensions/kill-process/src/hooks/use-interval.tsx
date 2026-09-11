import { useEffect, useRef } from "react";

const noop = () => {};

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(noop);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    if (delay === null) {
      return;
    }

    savedCallback.current();
    const refreshEnabled = delay > 0;
    if (!refreshEnabled) {
      return;
    }

    const interval = Math.max(delay, 1000);
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [delay]);
}

export default useInterval;
