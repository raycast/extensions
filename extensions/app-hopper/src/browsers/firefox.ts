import { readdir } from "node:fs/promises";
import { createConnection } from "node:net";
import path from "node:path";
import type { BrowserSummary } from "./types";
import type { BrowserConfig, BrowserWindow } from "./types";
import { runBrowserHelper } from "../helpers/browser-helper";
import { assertNativeTabTarget } from "../helpers/browser-tab-id";
import { sortWindows } from "../helpers/window-utils";
import { queryWindows, Window } from "../windows";
import type { GeckoBrowserId } from "./gecko-config";
import { FIREFOX_DIRECTORY, ZEN_DIRECTORY } from "./firefox-integration";
import { reconcileFirefoxWindows } from "./firefox-reconciliation";

const DIRECTORY = FIREFOX_DIRECTORY;
const MAX_BYTES = 1024 * 1024;

function request(session: string, command: object, browserId: GeckoBrowserId = "firefox"): Promise<unknown> {
  if (!/^[a-f0-9]{16}$/.test(session)) throw new Error("Invalid Firefox session");
  return new Promise((resolve, reject) => {
    const socket = createConnection(path.join(browserId === "zen" ? ZEN_DIRECTORY : DIRECTORY, `${session}.sock`));
    const chunks: Buffer[] = [];
    let size = 0;
    let complete = false;
    function finish(error?: Error, data?: unknown) {
      if (complete) return;
      complete = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(data);
    }
    socket.setTimeout(5000, () => finish(new Error("Firefox bridge timed out")));
    socket.on("error", (error) => finish(error));
    socket.on("connect", () => socket.write(JSON.stringify(command) + "\n"));
    socket.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BYTES) return finish(new Error("Firefox bridge response is too large"));
      chunks.push(chunk);
      if (!chunk.includes(10)) return;
      try {
        const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (result.error) finish(new Error(String(result.error)));
        else finish(undefined, result.data);
      } catch {
        finish(new Error("Invalid Firefox bridge response"));
      }
    });
    socket.on("end", () => {
      if (!complete) finish(new Error("Firefox bridge disconnected"));
    });
  });
}

function parseBridgeWindows(value: unknown, session: string): BrowserWindow[] {
  if (!Array.isArray(value)) throw new Error("Invalid Firefox window list");
  return value.map((window) => {
    if (!Number.isSafeInteger(window.id) || !Array.isArray(window.tabs)) throw new Error("Invalid Firefox window");
    return {
      id: `${session}:${window.id}`,
      title: typeof window.title === "string" ? window.title : "",
      tabs: window.tabs.map((tab: { id: number; title: string; url: string }) => {
        if (!Number.isSafeInteger(tab.id) || typeof tab.title !== "string" || typeof tab.url !== "string") {
          throw new Error("Invalid Firefox tab");
        }
        return { id: `${session}:${tab.id}`, title: tab.title, url: tab.url };
      }),
    };
  });
}

function parseAXWindows(raw: string): BrowserWindow[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid Firefox window list");
  return value.map((window) => {
    if (!window || typeof window !== "object" || typeof window.id !== "string" || !Array.isArray(window.tabs)) {
      throw new Error("Invalid Firefox window");
    }
    const space =
      typeof window.space === "number" && Number.isSafeInteger(window.space) && window.space > 0
        ? window.space
        : undefined;
    return {
      id: window.id,
      title: typeof window.title === "string" ? window.title : "",
      space,
      ...(window.tabListUnavailable === true ? { tabListUnavailable: true } : {}),
      tabs: window.tabs.map((tab: { id: string; title: string; url: string }) => {
        if (!tab || typeof tab.id !== "string" || typeof tab.title !== "string" || typeof tab.url !== "string") {
          throw new Error("Invalid Firefox tab");
        }
        return { id: tab.id, title: tab.title, url: tab.url };
      }),
    };
  });
}

function filterFirefoxNativeWindows(windows: Window[], appName: string): Window[] {
  const matching = windows.filter(
    (win) =>
      win &&
      win.app === appName &&
      Number.isSafeInteger(win.id) &&
      win.id > 0 &&
      (!win.subrole || win.subrole === "AXStandardWindow"),
  );
  return sortWindows(matching);
}

async function getFirefoxNativeWindows(appName: string): Promise<Window[]> {
  try {
    const allWindows = await queryWindows();
    return filterFirefoxNativeWindows(allWindows, appName);
  } catch {
    return [];
  }
}

async function getConnectedBridgeWindows(browserId: GeckoBrowserId = "firefox"): Promise<BrowserWindow[] | null> {
  const files = await readdir(browserId === "zen" ? ZEN_DIRECTORY : DIRECTORY).catch(() => []);
  const sessions = files.filter((file) => /^[a-f0-9]{16}\.sock$/.test(file)).map((file) => file.slice(0, -5));
  if (!sessions.length) return null;
  const results = await Promise.allSettled(
    sessions.map(async (session) =>
      parseBridgeWindows(await request(session, { command: "list" }, browserId), session),
    ),
  );
  const connected = results.filter(
    (result): result is PromiseFulfilledResult<BrowserWindow[]> => result.status === "fulfilled",
  );
  if (!connected.length) return null;
  return connected.flatMap((result) => result.value);
}

export async function isFirefoxBridgeConnected(browserId: GeckoBrowserId = "firefox"): Promise<boolean> {
  return (await getConnectedBridgeWindows(browserId)) !== null;
}

export async function getFirefoxCompanionVersions(browserId: GeckoBrowserId = "firefox"): Promise<string[]> {
  const files = await readdir(browserId === "zen" ? ZEN_DIRECTORY : DIRECTORY).catch(() => []);
  const sessions = files.filter((file) => /^[a-f0-9]{16}\.sock$/.test(file)).map((file) => file.slice(0, -5));
  const results = await Promise.allSettled(
    sessions.map((session) => request(session, { command: "status" }, browserId)),
  );
  return results.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    const value = result.value as { version?: unknown } | null;
    return typeof value?.version === "string" ? [value.version] : [];
  });
}

export async function disconnectFirefoxBridges(browserId: GeckoBrowserId = "firefox"): Promise<void> {
  const files = await readdir(browserId === "zen" ? ZEN_DIRECTORY : DIRECTORY).catch(() => []);
  const sessions = files.filter((file) => /^[a-f0-9]{16}\.sock$/.test(file)).map((file) => file.slice(0, -5));
  const results = await Promise.allSettled(
    sessions.map((session) => request(session, { command: "shutdown" }, browserId)),
  );
  for (const result of results) {
    if (result.status === "fulfilled") continue;
    const code = (result.reason as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT" && code !== "ECONNREFUSED") {
      throw new Error("Could not stop a Firefox helper. Restart Firefox and remove the local integration again.");
    }
  }
}

export async function getFirefoxWindows(
  browser?: BrowserConfig,
  preloadedNativeWindows?: Window[],
): Promise<BrowserWindow[]> {
  const appName = browser?.appName ?? "Firefox";
  const bridgeWindows = await getConnectedBridgeWindows(appName === "Zen" ? "zen" : "firefox");
  const nativeWindows = preloadedNativeWindows
    ? filterFirefoxNativeWindows(preloadedNativeWindows, appName)
    : await getFirefoxNativeWindows(appName);
  if (bridgeWindows && nativeWindows.length === 0) return bridgeWindows;
  const payload = JSON.stringify(
    nativeWindows.map((win) => ({
      id: win.id,
      pid: win.pid,
      space: win.space,
      title: win.title,
    })),
  );
  let axWindows: BrowserWindow[];
  try {
    const stdout = await runBrowserHelper("firefox-ax", DIRECTORY, ["list", appName, payload]);
    axWindows = parseAXWindows(stdout);
  } catch (error) {
    if (!bridgeWindows) throw error;
    axWindows = nativeWindows.map((window) => ({
      id: String(window.id),
      title: window.title,
      tabs: [],
      space: window.space,
      tabListUnavailable: true,
    }));
  }
  if (!bridgeWindows) return axWindows;

  return reconcileFirefoxWindows(bridgeWindows, axWindows, nativeWindows.length);
}

export async function getFirefoxSummary(
  browser?: BrowserConfig,
  preloadedNativeWindows?: Window[],
): Promise<BrowserSummary> {
  if (
    preloadedNativeWindows &&
    preloadedNativeWindows.length > 1 &&
    preloadedNativeWindows.every((win) => win["has-ax-reference"] !== false)
  ) {
    const bridgeWindows = await getConnectedBridgeWindows(browser?.appName === "Zen" ? "zen" : "firefox");
    if (!bridgeWindows) return { windows: preloadedNativeWindows.length, tabs: undefined };
  }

  const windows = await getFirefoxWindows(browser, preloadedNativeWindows);
  return {
    windows: windows.length,
    tabs: windows.length === 1 && !windows[0].tabListUnavailable ? windows[0].tabs.length : undefined,
  };
}

export async function focusFirefoxTab(
  windowId: string,
  tabId: string,
  browser?: BrowserConfig,
  expectedTitle = "",
): Promise<void> {
  const appName = browser?.appName ?? "Firefox";
  const sessionWindow = /^([a-f0-9]{16}):(\d+)$/.exec(windowId);
  if (sessionWindow) {
    const sessionTab = /^([a-f0-9]{16}):(\d+)$/.exec(tabId);
    if (!sessionTab || sessionWindow[1] !== sessionTab[1]) {
      throw new Error("Firefox tab session changed. Refresh the list.");
    }
    await request(
      sessionWindow[1],
      {
        command: "focus",
        windowId: Number(sessionWindow[2]),
        tabId: Number(sessionTab[2]),
      },
      appName === "Zen" ? "zen" : "firefox",
    );
    return;
  }

  assertNativeTabTarget(windowId, tabId, appName);
  const nativeWindows = await getFirefoxNativeWindows(appName);
  const matched = nativeWindows.find((win) => String(win.id) === windowId);
  const args = ["focus", appName, windowId, tabId, expectedTitle];
  if (matched && Number.isSafeInteger(matched.pid) && matched.pid > 0) {
    args.push(String(matched.pid));
  }

  await runBrowserHelper("firefox-ax", DIRECTORY, args);
}
