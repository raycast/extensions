import { getBrowserByAppName } from "./browsers/registry";
import type { AppWindowData } from "./app-window-evidence";
import { getBrowserSummary, getBrowserWindows } from "./browsers/client";
import { createBrowserSnapshot, retainBrowserSnapshot, summarizeBrowserWindows } from "./browsers/snapshot";
import { getApplicationOrder } from "./helpers/app-order";
import {
  AXWindow,
  RunningAppMetadata,
  Window,
  getRunningApplicationMetadata,
  getRunningApplications,
  queryAXWindows,
  queryWindows,
} from "./windows";

export interface WindowSearchData extends AppWindowData {
  windows: Window[];
  applicationOrder: number[];
  applications: RunningAppMetadata[];
  metadataByPid: Record<number, RunningAppMetadata>;
}

export function emptyWindowData(): WindowSearchData {
  return {
    windows: [],
    applications: [],
    applicationOrder: [],
    metadataByPid: {},
    browserCounts: {},
    browserTabs: {},
    axWindowsByPid: {},
  };
}

interface WindowDataQueries {
  queryWindows: typeof queryWindows;
  getRunningApplicationMetadata: typeof getRunningApplicationMetadata;
  queryAXWindows: typeof queryAXWindows;
  getBrowserSummary: typeof getBrowserSummary;
  getBrowserWindows?: typeof getBrowserWindows;
  getApplicationOrder?: typeof getApplicationOrder;
  getRunningApplications?: typeof getRunningApplications;
}

const systemQueries: WindowDataQueries = {
  queryWindows,
  getRunningApplicationMetadata,
  queryAXWindows,
  getBrowserSummary,
  getBrowserWindows,
  getApplicationOrder,
  getRunningApplications,
};

function sameNativeWindows(before: Window[], after: Window[]): boolean {
  return (
    before.length === after.length &&
    after.every((window) => before.some((candidate) => candidate.id === window.id && candidate.pid === window.pid))
  );
}

/** Retain enrichment only while its native window/process identities still exist. */
function retainWindowData(previous: WindowSearchData, windows: Window[]): WindowSearchData {
  const browserTabs: WindowSearchData["browserTabs"] = {};
  const browserCounts: WindowSearchData["browserCounts"] = {};
  const browsers = new Map(
    windows.flatMap((window) => {
      const browser = getBrowserByAppName(window.app);
      return browser ? [[browser.id, browser] as const] : [];
    }),
  );
  for (const [id, browser] of browsers) {
    const retained = retainBrowserSnapshot(
      createBrowserSnapshot(browser, {
        nativeWindows: previous.windows,
        windows: previous.browserTabs[id],
        summary: previous.browserCounts[id],
      }),
      windows,
    );
    if (retained.windows !== undefined) browserTabs[id] = retained.windows;
    if (retained.summary !== undefined) browserCounts[id] = retained.summary;
  }
  const pids = new Set([...windows.map((window) => window.pid), ...previous.applications.map((app) => app.pid)]);
  const axWindowsByPid = Object.fromEntries(
    Object.entries(previous.axWindowsByPid).filter(
      ([pid]) =>
        pids.has(Number(pid)) &&
        sameNativeWindows(
          previous.windows.filter((window) => window.pid === Number(pid)),
          windows.filter((window) => window.pid === Number(pid)),
        ),
    ),
  );
  return { ...previous, windows, browserTabs, browserCounts, axWindowsByPid };
}

/** Publish the native list first. Each optional query enriches it independently. */
export async function loadWindowData(
  publish: (data: WindowSearchData) => void,
  queries: WindowDataQueries = systemQueries,
  previous: WindowSearchData = emptyWindowData(),
): Promise<void> {
  const windows = await queries.queryWindows();

  const initialMetadata: Record<number, RunningAppMetadata> = {};
  const byPid = new Map<number, Window[]>();
  const browsers = new Map<string, NonNullable<ReturnType<typeof getBrowserByAppName>>>();
  const browserWindowsById = new Map<string, Window[]>();

  for (const window of windows) {
    const processWindows = byPid.get(window.pid) ?? [];
    processWindows.push(window);
    byPid.set(window.pid, processWindows);

    if (
      initialMetadata[window.pid] === undefined &&
      (window.bundlePath !== undefined || window.localizedName !== undefined)
    ) {
      initialMetadata[window.pid] = {
        pid: window.pid,
        bundlePath: window.bundlePath,
        localizedName: window.localizedName,
      };
    }

    const browser = getBrowserByAppName(window.app);
    if (browser) {
      browsers.set(browser.id, browser);
      const list = browserWindowsById.get(browser.id) ?? [];
      list.push(window);
      browserWindowsById.set(browser.id, list);
    }
  }

  let snapshot: WindowSearchData = {
    ...retainWindowData(previous, windows),
    metadataByPid: initialMetadata,
  };
  publish(snapshot);

  function update(data: Partial<WindowSearchData>) {
    snapshot = { ...snapshot, ...data };
    publish(snapshot);
  }

  const missingMetadataPids = [...byPid.keys()].filter((pid) => initialMetadata[pid] === undefined);

  async function loadAXWindows(pid: number) {
    let axWindows: AXWindow[] | null;
    try {
      axWindows = await queries.queryAXWindows(pid);
    } catch (error) {
      console.error(`Failed to query AX windows for PID ${pid}:`, error);
      axWindows = null;
    }
    update({ axWindowsByPid: { ...snapshot.axWindowsByPid, [pid]: axWindows } });
  }

  async function loadApplications() {
    if (!queries.getRunningApplications) return;
    try {
      const applications = await queries.getRunningApplications();
      const livePids = new Set([...byPid.keys(), ...applications.map((app) => app.pid)]);
      update({
        applications,
        axWindowsByPid: Object.fromEntries(
          Object.entries(snapshot.axWindowsByPid).filter(([pid]) => livePids.has(Number(pid))),
        ),
      });
      const windowlessApps = applications.filter((app) => !byPid.has(app.pid));
      await Promise.all(windowlessApps.map((app) => loadAXWindows(app.pid)));
    } catch (error) {
      console.error("Failed to resolve running applications:", error);
    }
  }

  async function loadApplicationOrder() {
    if (!queries.getApplicationOrder) return;
    try {
      update({ applicationOrder: await queries.getApplicationOrder() });
    } catch (error) {
      console.error("Failed to resolve application order:", error);
    }
  }

  async function loadMetadata() {
    if (missingMetadataPids.length === 0) return;
    try {
      const resolved = await queries.getRunningApplicationMetadata(missingMetadataPids);
      update({ metadataByPid: { ...snapshot.metadataByPid, ...resolved } });
    } catch (error) {
      console.error("Failed to resolve application metadata:", error);
    }
  }

  async function loadBrowserTabs(browser: NonNullable<ReturnType<typeof getBrowserByAppName>>) {
    const native = browserWindowsById.get(browser.id);
    try {
      if (!queries.getBrowserWindows) {
        const summary = await queries.getBrowserSummary(browser, native);
        update({ browserCounts: { ...snapshot.browserCounts, [browser.id]: summary } });
        return;
      }
      // Publish the cheap window count first, preserving any valid cached summary.
      if (native && native.length > 1 && native.every((window) => window["has-ax-reference"] !== false)) {
        const summary = snapshot.browserCounts[browser.id] ?? { windows: native.length };
        update({ browserCounts: { ...snapshot.browserCounts, [browser.id]: summary } });
      }
      const windows = await queries.getBrowserWindows(browser, native);
      update({
        browserCounts: { ...snapshot.browserCounts, [browser.id]: summarizeBrowserWindows(windows) },
        browserTabs: { ...snapshot.browserTabs, [browser.id]: windows },
      });
    } catch (error) {
      console.error(`Failed to load ${browser.appName} tabs:`, error);
    }
  }

  const fallbackPids = [...byPid]
    .filter(([, processWindows]) =>
      processWindows.some((window) => window["has-ax-reference"] === false && !getBrowserByAppName(window.app)),
    )
    .map(([pid]) => pid);
  await Promise.all([
    loadApplications(),
    loadApplicationOrder(),
    loadMetadata(),
    ...[...browsers.values()].map(loadBrowserTabs),
    ...fallbackPids.map(loadAXWindows),
  ]);
}
