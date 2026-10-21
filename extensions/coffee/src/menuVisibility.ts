const HIDE_DELAY_MS = 5 * 1000;

export interface MenuObservation {
  isRunning: boolean | undefined;
  isUserInitiated: boolean;
  hideWhenInactive: boolean;
}

export interface MenuVisibilityState {
  isRunning: boolean | undefined;
  isUserInitiated: boolean;
  visibleUntil: number;
}

export function createMenuVisibility(
  observation: MenuObservation,
  now: number,
  initialUserInitiated = observation.isUserInitiated,
): MenuVisibilityState {
  return {
    isRunning: observation.isRunning,
    isUserInitiated: observation.isUserInitiated,
    visibleUntil: initialUserInitiated ? now + HIDE_DELAY_MS : 0,
  };
}

export function observeMenuVisibility(
  state: MenuVisibilityState,
  observation: MenuObservation,
  now: number,
): MenuVisibilityState {
  const launchedByUser = observation.isUserInitiated && !state.isUserInitiated;
  const becameInactive = state.isRunning === true && observation.isRunning === false && observation.hideWhenInactive;
  const visibleUntil = observation.isRunning
    ? 0
    : launchedByUser || becameInactive
      ? now + HIDE_DELAY_MS
      : state.visibleUntil;

  if (
    state.isRunning === observation.isRunning &&
    state.isUserInitiated === observation.isUserInitiated &&
    state.visibleUntil === visibleUntil
  ) {
    return state;
  }
  return { isRunning: observation.isRunning, isUserInitiated: observation.isUserInitiated, visibleUntil };
}

export function keepMenuVisible(state: MenuVisibilityState, now: number): MenuVisibilityState {
  return { ...state, visibleUntil: now + HIDE_DELAY_MS };
}

export function getMenuVisibility(
  state: MenuVisibilityState,
  observation: MenuObservation & { isLoading: boolean; hasError: boolean },
  now: number,
): { isVisible: boolean; hideAt: number | null } {
  if (
    !observation.hideWhenInactive ||
    observation.isLoading ||
    observation.hasError ||
    observation.isRunning !== false
  ) {
    return { isVisible: true, hideAt: null };
  }
  const inGracePeriod = now < state.visibleUntil;
  return { isVisible: inGracePeriod, hideAt: inGracePeriod ? state.visibleUntil : null };
}
