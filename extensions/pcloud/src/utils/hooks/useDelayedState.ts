import { useEffect, useState } from "react";

export function useDelayedState<T>(state: T, delay: number) {
  const [delayedState, setDelayedState] = useState<T>(state);

  useEffect(() => {
    setTimeout(() => {
      setDelayedState(state);
    }, delay);
  }, [delay, state]);

  return delayedState;
}
