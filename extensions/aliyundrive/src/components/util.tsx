import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    function tick() {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      savedCallback.current();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
