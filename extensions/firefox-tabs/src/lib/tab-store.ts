/**
 * State for the Search Firefox Tabs list, as a reducer so every interaction
 * between full loads, background refreshes and tab actions can be tested.
 *
 * - A full load (on open, Retry, or a host starting or stopping) is
 *   authoritative: it replaces the tabs and clears or sets the error.
 * - A background refresh only replaces the tabs if nothing authoritative
 *   happened since it started (`startedAt` must equal `version`), and only
 *   when something shown changed, because Raycast re-serializes the whole
 *   list on every render.
 * - A tab being closed is hidden at once and stays hidden from refreshes
 *   until its close settles; a failed close brings it back. A full load
 *   that started before a close succeeded doesn't bring the tab back.
 */

/** The fields the store needs from a tab. */
export interface StoreTab {
  host: { key: string };
  id: number;
}

export interface TabState<T extends StoreTab> {
  tabs: T[];
  error: unknown;
  /** Keys of tabs being closed. */
  closing: string[];
  /** Bumped by every authoritative change; refreshes started earlier are stale. */
  version: number;
  /** Consecutive background refreshes in which every host failed. */
  failedRefreshes: number;
  /** Tabs closed successfully, with the version at which each close settled. */
  closed: Array<{ key: string; version: number }>;
}

export type TabAction<T extends StoreTab> =
  | { type: "loaded"; tabs: T[]; startedAt: number }
  | { type: "loadFailed"; error: unknown }
  | { type: "refreshed"; tabs: T[]; startedAt: number }
  | { type: "refreshFailed"; startedAt: number }
  | { type: "closeStarted"; key: string }
  | { type: "closeSettled"; key: string; ok: boolean };

/** How long a list that had tabs waits for restarting hosts before reporting an error. */
export const HOST_RESTART_GRACE_MS = 5000;

/** After this many failed background refreshes in a row, do a full load to show the error. */
export const MAX_FAILED_REFRESHES = 3;

export const storeTabKey = (tab: StoreTab) => `${tab.host.key}:${tab.id}`;

export function initialTabState<T extends StoreTab>(): TabState<T> {
  return { tabs: [], error: null, closing: [], version: 0, failedRefreshes: 0, closed: [] };
}

export function tabReducer<T extends StoreTab>(
  state: TabState<T>,
  action: TabAction<T>,
  changed: (shown: T[], fresh: T[]) => boolean
): TabState<T> {
  switch (action.type) {
    case "loaded": {
      // Tabs closed after this load started may still be in its result.
      const closedSince = new Set(state.closed.filter((c) => c.version > action.startedAt).map((c) => c.key));
      return {
        ...state,
        tabs: closedSince.size ? action.tabs.filter((t) => !closedSince.has(storeTabKey(t))) : action.tabs,
        error: null,
        version: state.version + 1,
        failedRefreshes: 0,
        closed: state.closed.filter((c) => c.version > action.startedAt),
      };
    }
    case "loadFailed":
      // Empty the list so the error view, not the last tabs, is shown.
      return { ...state, tabs: [], error: action.error, version: state.version + 1, failedRefreshes: 0 };
    case "refreshed": {
      if (action.startedAt !== state.version) return state;
      const tabsChanged = changed(state.tabs, action.tabs);
      // An accepted refresh started after every recorded close settled, and
      // no full load runs alongside it, so the record can be pruned.
      if (!tabsChanged && state.error === null && state.failedRefreshes === 0 && state.closed.length === 0) {
        return state;
      }
      return { ...state, tabs: tabsChanged ? action.tabs : state.tabs, error: null, failedRefreshes: 0, closed: [] };
    }
    case "refreshFailed":
      if (action.startedAt !== state.version) return state;
      return { ...state, failedRefreshes: state.failedRefreshes + 1 };
    case "closeStarted":
      if (state.closing.includes(action.key)) return state;
      return { ...state, closing: [...state.closing, action.key], version: state.version + 1 };
    case "closeSettled":
      return {
        ...state,
        closing: state.closing.filter((k) => k !== action.key),
        tabs: action.ok ? state.tabs.filter((t) => storeTabKey(t) !== action.key) : state.tabs,
        version: state.version + 1,
        closed: action.ok ? [...state.closed, { key: action.key, version: state.version + 1 }] : state.closed,
      };
  }
}

/** Tabs to show: everything except tabs being closed. */
export function visibleTabs<T extends StoreTab>(state: TabState<T>): T[] {
  if (state.closing.length === 0) return state.tabs;
  const closing = new Set(state.closing);
  return state.tabs.filter((t) => !closing.has(storeTabKey(t)));
}

/**
 * Whether background refreshes have failed often enough, while tabs are
 * shown, to warrant a full load that shows the error. While an error is
 * already shown, a refresh that works clears it, so no reload is needed.
 */
export function needsFullLoad<T extends StoreTab>(state: TabState<T>): boolean {
  return state.error === null && state.failedRefreshes >= MAX_FAILED_REFRESHES;
}

/**
 * Wait until `readHosts` finds a host, for up to `timeoutMs`. Hosts vanish
 * for a moment whenever they restart (after a native host update, or when
 * Firefox updates the companion extension) and come back once Firefox
 * relaunches them; a list that had tabs waits for that instead of reporting
 * Firefox as not set up.
 */
export async function waitForHosts<H>(
  readHosts: () => H[],
  timeoutMs: number,
  { pollMs = 250, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {}
): Promise<H[]> {
  let hosts = readHosts();
  for (let waited = 0; hosts.length === 0 && waited < timeoutMs; waited += pollMs) {
    await sleep(pollMs);
    hosts = readHosts();
  }
  return hosts;
}
