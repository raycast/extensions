import { useRef } from "react";

export default function useInputRateLimiter(limit: number, timeWindowMs: number) {
  const lastRequestTime = useRef<number>(0);

  function canExecute() {
    const currentTime = Date.now();

    if (currentTime - lastRequestTime.current < timeWindowMs / limit) {
      return false;
    }

    lastRequestTime.current = currentTime;
    return true;
  }

  return { canExecute };
}
