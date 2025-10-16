import { useEffect, useRef } from "react";

export function useInterval(callback: () => false | void, delay?: number | false) {
  const latestCallback = useRef(callback);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!delay && delay !== 0) {
      return;
    }

    const id = setInterval(() => {
      if (latestCallback.current() === false) {
        clearInterval(id);
      }
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}
