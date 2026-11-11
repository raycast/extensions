import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { defi } from "./defi";
import { parseWindows, parseWorkspaces } from "./parse";

export async function readDesktop() {
  const [windows, workspaces] = await Promise.all([
    defi("list-windows", "--json").then(parseWindows),
    defi("list-workspaces", "--json").then(parseWorkspaces),
  ]);
  return { windows, workspaces };
}

async function readApps() {
  return (await getApplications()).map(({ bundleId, name, path }) => ({ bundleId, name, path }));
}

// Windows and workspaces, shown from the last run at once while they reload.
// No live stream: launchers do not always run effect cleanups, which would leave `defi subscribe` running.
export function useDesktop() {
  // The empty view reports the error with its recovery actions, so no toast as well.
  const desktop = useCachedPromise(readDesktop, [], { onError: () => undefined });
  const apps = useCachedPromise(readApps);
  const appsByID = new Map(apps.data?.map((app) => [app.bundleId, app]));
  const windows = desktop.data?.windows;
  return {
    windows,
    workspaces: desktop.data?.workspaces,
    isLoading: desktop.isLoading,
    error: desktop.error,
    revalidate: desktop.revalidate,
    // The state to act on: a fresh read while the cached one is still reloading.
    fresh: async () => (desktop.isLoading || !desktop.data ? await readDesktop() : desktop.data),
    displayCount: new Set(desktop.data?.workspaces.map((workspace) => workspace.display)).size,
    focused: windows?.find((window) => window.focused),
    // The workspace the user is on, even when it holds no window.
    current: desktop.data?.workspaces.find((workspace) => workspace.active && workspace.focusedDisplay),
    appIcon: (bundleID?: string) => {
      const path = bundleID ? appsByID.get(bundleID)?.path : undefined;
      return path ? { fileIcon: path } : undefined;
    },
    appName: (bundleID: string) =>
      appsByID.get(bundleID)?.name ?? windows?.find((window) => window.appID === bundleID)?.appName ?? bundleID,
  };
}
