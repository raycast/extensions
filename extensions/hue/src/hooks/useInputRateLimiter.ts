import { useRef } from "react";

export function useInputRateLimiter(minIntervalMs: number) {
  const lastRequestTime = useRef<number>(0);

  return function canExecute() {
    const currentTime = Date.now();

    if (currentTime - lastRequestTime.current < minIntervalMs) {
      return false;
    }

    lastRequestTime.current = currentTime;
    return true;
  };
}
