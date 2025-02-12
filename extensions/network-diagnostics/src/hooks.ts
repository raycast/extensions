import { useEffect, useRef } from "react";

type Callback = () => void;

export function useInterval(callback: Callback, delay: number, startImmediately = true) {
  const savedCallback = useRef<Callback>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      if (startImmediately) {
        savedCallback.current?.();
      }

      const id = setInterval(() => {
        savedCallback.current?.();
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
