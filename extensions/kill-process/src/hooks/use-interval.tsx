import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(noop);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    if (!delay && delay !== 0) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default useInterval;
