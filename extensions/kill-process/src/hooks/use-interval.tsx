import { useEffect, useRef } from "react";

/* istanbul ignore next */
/** keep typescript happy */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export function useInterval(callback: () => void, delay: number | null | false, immediate?: boolean) {
  const savedCallback = useRef(noop);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  });

  // Execute callback if immediate is set.
  useEffect(() => {
    if (!immediate || delay === null || delay === false) return;
    savedCallback.current();
  }, [immediate]);

  // Set up the interval.
  useEffect(() => {
    if (delay === null || delay === false) return;
    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default useInterval;
