const NATIVE_WINDOW_ID = /^\d+$/;
const LEGACY_TAB_ID = /^(?:\d+:)?\d+$/;
const RETAINED_TAB_ID = /^\d+:ax:[a-f0-9-]{36}$/;

export function isRetainedTabId(tabId: string): boolean {
  return tabId.includes(":ax:");
}

export function assertNativeTabTarget(windowId: string, tabId: string, browserName: string): void {
  if (!NATIVE_WINDOW_ID.test(windowId) || (!LEGACY_TAB_ID.test(tabId) && !RETAINED_TAB_ID.test(tabId))) {
    throw new Error(`Invalid ${browserName} tab or window ID`);
  }
}
