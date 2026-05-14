import { useState, useEffect, useRef } from "react";

export function useInterval<T>(interval: number, callback: () => T): T | undefined {
  // Store value directly in state to guarantee re-renders
  const [value, setValue] = useState<T | undefined>(undefined);
  const callbackRef = useRef(callback);

  // Always keep the latest callback without retriggering the interval effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Initial calculation
    setValue(callbackRef.current());

    // Setup interval
    const intervalId = setInterval(() => {
      setValue(callbackRef.current());
    }, interval);

    // Cleanup on unmount or when interval changes
    return () => clearInterval(intervalId);
  }, [interval]);

  return value;
}
