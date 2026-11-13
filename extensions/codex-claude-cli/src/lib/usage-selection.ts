import { currentUsageWindows, type ProviderUsageState, type UsageProvider, type UsageWindow } from "./usage";

export type MenuBarWindow = "automatic" | "short-term" | "weekly";

export interface LimitingWindow {
  provider: UsageProvider;
  window: UsageWindow;
  lastObserved?: boolean;
}

/** Only quota-only Claude bridge observations may outlive the normal cache age. */
export function selectMenuBarWindow(
  states: ProviderUsageState[],
  provider: UsageProvider | undefined,
  selection: MenuBarWindow,
  now = Date.now(),
  usageOnly = false,
): LimitingWindow | undefined {
  const candidates = states
    .filter((state) => !provider || state.provider === provider)
    .flatMap((state) => {
      const invalidBridge =
        usageOnly &&
        state.provider === "claude" &&
        (!state.bridgeConnected ||
          state.needsConnection ||
          !state.data ||
          !Number.isFinite(state.data.fetchedAt) ||
          state.data.fetchedAt <= 0 ||
          state.data.fetchedAt > now);
      if (invalidBridge) return [];
      const current = currentUsageWindows(state, now);
      const retained = current.length ? [] : retainedClaudeWindows(state, usageOnly, now);
      return (retained.length ? retained : current).map((window) => ({
        provider: state.provider,
        window,
        lastObserved: retained.length > 0,
      }));
    });
  const matching = candidates.filter(({ window }) => {
    if (selection === "automatic") return true;
    if (selection === "short-term") return isShortTermWindow(window);
    return isWeeklyWindow(window);
  });
  return (matching.length > 0 ? matching : candidates).sort(
    (left, right) => left.window.remainingPercent - right.window.remainingPercent,
  )[0];
}

export function isShortTermWindow(window: UsageWindow): boolean {
  return Boolean(
    (window.durationMinutes && window.durationMinutes <= 1_440) ||
    window.id.includes("five_hour") ||
    /5[- ]hour/i.test(window.title),
  );
}

function isWeeklyWindow(window: UsageWindow): boolean {
  return Boolean(
    window.id.toLowerCase().includes("week") ||
    /week/i.test(window.title) ||
    (window.durationMinutes && window.durationMinutes >= 6 * 24 * 60 && window.durationMinutes <= 8 * 24 * 60),
  );
}

function retainedClaudeWindows(state: ProviderUsageState, usageOnly: boolean, now: number): UsageWindow[] {
  if (
    !usageOnly ||
    state.provider !== "claude" ||
    !state.bridgeConnected ||
    state.needsConnection ||
    state.error ||
    !state.data ||
    !["live", "cache", "stale"].includes(state.source) ||
    !Number.isFinite(state.data.fetchedAt) ||
    state.data.fetchedAt <= 0 ||
    state.data.fetchedAt > now
  )
    return [];
  // Validate percentages through the shared filter, but require an explicit unexpired reset.
  const observed = currentUsageWindows({ ...state, source: "cache", data: { ...state.data, fetchedAt: now } }, now);
  return observed.filter((window) => window.resetsAt !== undefined);
}
