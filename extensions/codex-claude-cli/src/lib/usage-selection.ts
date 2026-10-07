import { currentUsageWindows, type ProviderUsageState, type UsageProvider, type UsageWindow } from "./usage";

export type MenuBarWindow = "automatic" | "short-term" | "weekly";

export interface LimitingWindow {
  provider: UsageProvider;
  window: UsageWindow;
}

/** Historical observations never participate, including an explicitly selected provider. */
export function selectMenuBarWindow(
  states: ProviderUsageState[],
  provider: UsageProvider | undefined,
  selection: MenuBarWindow,
  now = Date.now(),
): LimitingWindow | undefined {
  const candidates = states
    .filter((state) => !provider || state.provider === provider)
    .flatMap((state) => currentUsageWindows(state, now).map((window) => ({ provider: state.provider, window })));
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
