import { useEffect, useRef } from "react";

export function useInterval(callback: () => void, intervalMs: number) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    savedCallback.current();

    if (intervalMs <= 0) return;

    const ms = Math.max(intervalMs, 1000);
    const id = setInterval(() => savedCallback.current(), ms);
    return () => clearInterval(id);
  }, [intervalMs]);
}
