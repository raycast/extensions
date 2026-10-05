import type { Platform } from "../src/lib/platform/model.ts";

/** A Platform where every call fails unless overridden; records AppleScript calls and reported errors. */
export function fakePlatform(
  overrides: Partial<Platform> = {},
): Platform & { scripts: string[]; reports: { error: unknown; context: string }[] } {
  const scripts: string[] = [];
  const reports: { error: unknown; context: string }[] = [];
  // In-memory LocalStorage, shared by loadJson/saveJson unless overridden.
  const store = new Map<string, unknown>();
  const unexpected = (name: string) => () => Promise.reject(new Error(`unexpected ${name}`));
  return {
    scripts,
    reports,
    runAppleScript: async (script) => {
      scripts.push(script);
      return overrides.runAppleScript ? overrides.runAppleScript(script) : "";
    },
    accessibilityTrusted: overrides.accessibilityTrusted ?? (async () => true),
    windows: overrides.windows ?? unexpected("windows"),
    raiseWindow: overrides.raiseWindow ?? unexpected("raiseWindow"),
    sidebarRows: overrides.sidebarRows ?? unexpected("sidebarRows"),
    openSidebarRow: overrides.openSidebarRow ?? unexpected("openSidebarRow"),
    labelWithSuffix: overrides.labelWithSuffix ?? (async () => undefined),
    loadJson:
      overrides.loadJson ??
      (async <T>(key: string, fallback: T): Promise<T> => (store.has(key) ? (store.get(key) as T) : fallback)),
    saveJson:
      overrides.saveJson ??
      (async (key, value) => {
        store.set(key, JSON.parse(JSON.stringify(value)));
      }),
    homeDir: overrides.homeDir ?? (() => "/Users/me"),
    readFiles: overrides.readFiles ?? (async () => []),
    readJsonFields: overrides.readJsonFields ?? (async () => []),
    readIndexedDbBlobs: overrides.readIndexedDbBlobs ?? (async () => []),
    openUrl: overrides.openUrl ?? unexpected("openUrl"),
    pressWebElement: overrides.pressWebElement ?? unexpected("pressWebElement"),
    webPages: overrides.webPages ?? (async () => []),
    menuItems: overrides.menuItems ?? (async () => []),
    pressMenuItem: overrides.pressMenuItem ?? unexpected("pressMenuItem"),
    querySqlite: overrides.querySqlite ?? (async () => []),
    listDir: overrides.listDir ?? (async () => []),
    processes: overrides.processes ?? (async () => []),
    socketRequest: overrides.socketRequest ?? unexpected("socketRequest"),
    readTail: overrides.readTail ?? unexpected("readTail"),
    gitRepos: overrides.gitRepos ?? (async (dirs) => dirs.map(() => undefined)),
    reportError: overrides.reportError ?? ((error, context) => reports.push({ error, context })),
  };
}

export const app = (bundleId: string, name = bundleId) => ({ bundleId, name, path: `/Applications/${name}.app` });
