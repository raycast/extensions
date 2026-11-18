import { useEffect, useState } from "react";
import { createMenuVisibility, getMenuVisibility, keepMenuVisible, observeMenuVisibility } from "../menuVisibility";
import type { MenuObservation } from "../menuVisibility";

export function useMenuVisibility({
  isRunning,
  isUserInitiated,
  hideWhenInactive,
  isLoading,
  hasError,
  initialUserInitiated,
}: MenuObservation & { isLoading: boolean; hasError: boolean; initialUserInitiated: boolean }) {
  const observation = { isRunning, isUserInitiated, hideWhenInactive };
  const [state, setState] = useState(() => createMenuVisibility(observation, Date.now(), initialUserInitiated));
  const [, setTick] = useState(0);

  // Include the pending transition in this render so the icon cannot briefly
  // disappear before the effect records its new grace period.
  const pendingState = observeMenuVisibility(state, observation, Date.now());
  const { isVisible, hideAt } = getMenuVisibility(pendingState, { ...observation, isLoading, hasError }, Date.now());

  useEffect(() => {
    setState((previous) =>
      observeMenuVisibility(previous, { isRunning, isUserInitiated, hideWhenInactive }, Date.now()),
    );
  }, [isRunning, isUserInitiated, hideWhenInactive]);

  useEffect(() => {
    if (hideAt === null) return;
    const timer = setTimeout(() => setTick((tick) => tick + 1), Math.max(0, hideAt - Date.now()));
    return () => clearTimeout(timer);
  }, [hideAt]);

  const keepVisibleAfterStop = () => setState((previous) => keepMenuVisible(previous, Date.now()));
  return { isVisible, keepVisibleAfterStop };
}
