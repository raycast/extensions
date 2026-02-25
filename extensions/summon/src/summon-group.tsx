import {
  List,
  ActionPanel,
  Action,
  Icon,
  showHUD,
  showToast,
  Toast,
  LaunchProps,
  closeMainWindow,
  popToRoot,
  confirmAlert,
  Alert,
  useNavigation,
  Application,
  getApplications,
  Cache,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import {
  getGroups,
  getGroupByName,
  deleteGroup,
  saveGroup,
  reorderGroup,
} from "./utils/storage";
import {
  raiseWindow,
  setWindowFrame,
  launchApp,
  getAllWindows,
  getAllWindowsAsync,
  getDisplays,
  windowToDisplayId,
} from "./utils/native";
import { Group, GroupWindow, WindowInfo } from "./utils/types";
import { GroupForm } from "./create-group";
import {
  isSupportedBrowser,
  getBrowserTabs,
  switchToTab,
  focusBrowserWindow,
  closeTab,
  closeBrowserWindow,
  getDomain,
  BrowserTab,
} from "./utils/browser-tabs";

interface Arguments {
  groupName?: string;
}

/**
 * Summon a group: raise/restore windows, relaunch closed apps if needed.
 * Returns a HUD message string.
 */
async function summonGroup(group: Group): Promise<string> {
  const missingBundleIds = new Set<string>();
  const missingAppNames = new Map<string, string>(); // bundleId -> appName

  // First pass: raise or restore each window
  for (const win of group.windows) {
    let success: boolean;

    if (group.restoreLayout && win.frame) {
      // Check if the saved display is still connected
      let shouldRestore = true;
      if (win.displayId) {
        try {
          const currentDisplays = getDisplays();
          const displayExists = currentDisplays.some(
            (d) => d.displayId === win.displayId,
          );
          if (!displayExists) {
            shouldRestore = false; // Monitor disconnected — raise only
          }
        } catch {
          shouldRestore = false;
        }
      }

      if (shouldRestore) {
        success = setWindowFrame(
          win.bundleId,
          win.titleMatch,
          win.windowId,
          win.frame.x,
          win.frame.y,
          win.frame.width,
          win.frame.height,
        );
      } else {
        success = raiseWindow(win.bundleId, win.titleMatch, win.windowId);
      }
    } else {
      success = raiseWindow(win.bundleId, win.titleMatch, win.windowId);
    }

    if (!success) {
      missingBundleIds.add(win.bundleId);
      missingAppNames.set(win.bundleId, win.appName);
    }
  }

  let relaunchedCount = 0;

  // If any apps are not running and relaunch is enabled, offer to relaunch
  if (missingBundleIds.size > 0 && group.relaunchApps) {
    const appNames = [...missingBundleIds].map(
      (bid) => missingAppNames.get(bid) ?? bid,
    );
    const message =
      appNames.length === 1
        ? `${appNames[0]} is not running. Relaunch it?`
        : `${appNames.length} apps are not running: ${appNames.join(", ")}. Relaunch them?`;

    const shouldRelaunch = await confirmAlert({
      title: "Apps Not Running",
      message,
      primaryAction: { title: "Relaunch" },
      dismissAction: { title: "Skip" },
    });

    if (shouldRelaunch) {
      // Launch each missing app (deduplicated by bundle ID)
      for (const bundleId of missingBundleIds) {
        const result = launchApp(bundleId);
        if (result.ok && !result.alreadyRunning) {
          relaunchedCount++;
        }
      }

      if (relaunchedCount > 0) {
        // Poll for apps to appear and retry raise/restore
        const windowsToRetry = group.windows.filter((w) =>
          missingBundleIds.has(w.bundleId),
        );
        await waitAndRetry(windowsToRetry, group.restoreLayout ?? false);
      }
    }
  }

  if (relaunchedCount > 0) {
    return `Summoned "${group.name}" (relaunched ${relaunchedCount} app${relaunchedCount > 1 ? "s" : ""})`;
  }
  return `Summoned "${group.name}"`;
}

/**
 * Wait for relaunched apps to become available, then retry raise/restore.
 * Polls every 500ms, times out after 5s.
 */
async function waitAndRetry(
  windows: GroupWindow[],
  restoreLayout: boolean,
): Promise<void> {
  const maxAttempts = 10; // 10 * 500ms = 5s
  const bundleIds = new Set(windows.map((w) => w.bundleId));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const liveWindows = getAllWindows();
      const liveBundleIds = new Set(liveWindows.map((w) => w.appBundleId));

      // Check if all needed apps are now running
      const allRunning = [...bundleIds].every((bid) => liveBundleIds.has(bid));

      if (allRunning) {
        // Retry raise/restore for each window
        for (const win of windows) {
          if (restoreLayout && win.frame) {
            setWindowFrame(
              win.bundleId,
              win.titleMatch,
              undefined, // windowId is stale after relaunch
              win.frame.x,
              win.frame.y,
              win.frame.width,
              win.frame.height,
            );
          } else {
            raiseWindow(win.bundleId, win.titleMatch, undefined);
          }
        }
        return;
      }
    } catch {
      // Continue polling
    }
  }

  // Timeout — try one last time anyway
  for (const win of windows) {
    raiseWindow(win.bundleId, win.titleMatch, undefined);
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Some apps are still launching",
  });
}

/**
 * Snapshot the current layout for a group: re-capture frame + displayId
 * from live window positions.
 */
async function snapshotLayout(group: Group): Promise<void> {
  const liveWindows = getAllWindows();
  const displays = getDisplays();

  const updatedWindows = group.windows.map((gw) => {
    // Find matching live window by bundleId + titleMatch
    const match = liveWindows.find((lw) => {
      if (lw.appBundleId !== gw.bundleId) return false;
      if (gw.titleMatch && !lw.windowTitle.includes(gw.titleMatch))
        return false;
      return true;
    });

    if (match) {
      return {
        ...gw,
        windowId: match.windowId,
        frame: {
          x: match.x,
          y: match.y,
          width: match.width,
          height: match.height,
        },
        displayId: windowToDisplayId(
          match.x,
          match.y,
          match.width,
          match.height,
          liveWindows,
          displays,
        ),
      };
    }

    // Window not currently open — keep existing frame data
    return gw;
  });

  saveGroup({ ...group, windows: updatedWindows });

  await showToast({
    style: Toast.Style.Success,
    title: `Layout snapshot saved for "${group.name}"`,
  });
}

/** Filter to only regular (foreground) app windows. */
function getRegularAppWindows(windows: WindowInfo[]): WindowInfo[] {
  return windows.filter((w) => w.isRegularApp);
}

const cache = new Cache();

function readCache<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, value: unknown): void {
  cache.set(key, JSON.stringify(value));
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  // Groups load synchronously from local JSON — available on first render
  const [groups, setGroups] = useState<Group[]>(() => getGroups());

  // Initialize from cache for instant display, then refresh in background
  const [openWindows, setOpenWindows] = useState<WindowInfo[]>(
    () => readCache<WindowInfo[]>("openWindows") ?? [],
  );
  const [browserTabs, setBrowserTabs] = useState<BrowserTab[]>(
    () => readCache<BrowserTab[]>("browserTabs") ?? [],
  );
  const [browserBundleIds, setBrowserBundleIds] = useState<Set<string>>(
    () => new Set(readCache<string[]>("browserBundleIds") ?? []),
  );
  const [appPaths, setAppPaths] = useState<Map<string, string>>(
    () => new Map(readCache<[string, string][]>("appPaths") ?? []),
  );
  const { push } = useNavigation();
  const pollCooldownRef = useRef(0);
  const pollVersionRef = useRef(0);

  function reload() {
    setGroups(getGroups());
  }

  // Handle groupName argument + refresh data in background
  useEffect(() => {
    const name = props.arguments.groupName?.trim();
    if (name) {
      const group = getGroupByName(name);
      if (group) {
        handleSummon(group);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `Group "${name}" not found`,
        });
      }
    }

    // Refresh all data asynchronously — never blocks the UI
    (async () => {
      let regularWindows: WindowInfo[] = [];
      try {
        regularWindows = getRegularAppWindows(await getAllWindowsAsync());
        setOpenWindows(regularWindows);
        writeCache("openWindows", regularWindows);
      } catch {
        // Non-critical
      }

      const detectedBrowserIds = new Set<string>();
      for (const win of regularWindows) {
        if (isSupportedBrowser(win.appBundleId)) {
          detectedBrowserIds.add(win.appBundleId);
        }
      }
      setBrowserBundleIds(detectedBrowserIds);
      writeCache("browserBundleIds", [...detectedBrowserIds]);

      // Fetch app paths and browser tabs in parallel
      await Promise.all([
        getApplications()
          .then((apps: Application[]) => {
            const map = new Map<string, string>();
            for (const app of apps) {
              if (app.bundleId && app.path) {
                map.set(app.bundleId, app.path);
              }
            }
            setAppPaths(map);
            writeCache("appPaths", [...map.entries()]);
          })
          .catch(() => {}),

        detectedBrowserIds.size > 0
          ? Promise.all(
              [...detectedBrowserIds].map((id) => getBrowserTabs(id)),
            ).then((results) => {
              const allTabs = results.flat();
              setBrowserTabs(allTabs);
              writeCache("browserTabs", allTabs);
            })
          : Promise.resolve().then(() => {
              // No browsers open — clear stale cached tabs
              setBrowserTabs([]);
              writeCache("browserTabs", []);
            }),
      ]);
    })();
  }, []);

  // Poll browser tabs so new/closed tabs appear quickly
  const browserBundleIdKey = [...browserBundleIds].sort().join(",");

  useEffect(() => {
    if (!browserBundleIdKey) return;
    const ids = browserBundleIdKey.split(",");
    const id = setInterval(async () => {
      if (Date.now() < pollCooldownRef.current) return;
      const version = pollVersionRef.current;
      try {
        const results = await Promise.all(
          ids.map((bid) => getBrowserTabs(bid)),
        );
        if (version !== pollVersionRef.current) return;
        const allTabs = results.flat();
        setBrowserTabs(allTabs);
        writeCache("browserTabs", allTabs);
      } catch {
        // Non-critical
      }
    }, 2000);
    return () => clearInterval(id);
  }, [browserBundleIdKey]);

  async function handleSummon(group: Group) {
    try {
      const hudMessage = await summonGroup(group);
      await showHUD(hudMessage);
      await closeMainWindow({ clearRootSearch: true });
      await popToRoot({ clearSearchBar: true });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Summon Failed",
        message: String(err),
      });
    }
  }

  async function handleDelete(group: Group) {
    if (
      await confirmAlert({
        title: `Delete "${group.name}"?`,
        message: "This action cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      deleteGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      await showToast({ style: Toast.Style.Success, title: "Group Deleted" });
    }
  }

  async function handleSnapshot(group: Group) {
    await snapshotLayout(group);
    reload();
  }

  function handleReorder(id: string, direction: "up" | "down") {
    reorderGroup(id, direction);
    reload();
  }

  async function handleRaiseApp(win: WindowInfo) {
    raiseWindow(win.appBundleId, win.windowTitle, win.windowId);
    await showHUD(`Switched to ${win.appName}`);
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot({ clearSearchBar: true });
  }

  async function handleFocusBrowserWindow(tab: BrowserTab) {
    const ok = await focusBrowserWindow(tab.bundleId, tab.windowIndex);
    if (!ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch window",
      });
      return;
    }
    const label = tab.windowName || tab.appName;
    await showHUD(`Switched to ${label}`);
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot({ clearSearchBar: true });
  }

  async function handleSwitchTab(tab: BrowserTab) {
    const ok = await switchToTab(tab.bundleId, tab.windowIndex, tab.tabIndex);
    if (!ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch tab",
      });
      return;
    }
    await showHUD(`Switched to ${tab.title}`);
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot({ clearSearchBar: true });
  }

  async function handleCloseTab(tab: BrowserTab) {
    pollVersionRef.current++;
    pollCooldownRef.current = Date.now() + 2500;
    let snapshot: BrowserTab[] = [];
    setBrowserTabs((prev) => {
      snapshot = prev;
      return prev.filter(
        (t) =>
          !(
            t.bundleId === tab.bundleId &&
            t.windowIndex === tab.windowIndex &&
            t.tabIndex === tab.tabIndex
          ),
      );
    });
    const ok = await closeTab(
      tab.bundleId,
      tab.windowIndex,
      tab.tabIndex,
      tab.windowName,
      tab.url,
    );
    if (!ok) {
      setBrowserTabs(snapshot);
      pollCooldownRef.current = 0;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to close tab",
      });
    }
  }

  async function handleCloseBrowserWindow(tab: BrowserTab) {
    pollVersionRef.current++;
    pollCooldownRef.current = Date.now() + 2500;
    let snapshot: BrowserTab[] = [];
    setBrowserTabs((prev) => {
      snapshot = prev;
      return prev.filter(
        (t) =>
          !(t.bundleId === tab.bundleId && t.windowIndex === tab.windowIndex),
      );
    });
    const ok = await closeBrowserWindow(
      tab.bundleId,
      tab.windowIndex,
      tab.windowName,
    );
    if (!ok) {
      setBrowserTabs(snapshot);
      pollCooldownRef.current = 0;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to close window",
      });
    }
  }

  // Non-browser windows (browsers are replaced by their tabs)
  const nonBrowserWindows = openWindows.filter(
    (w) => !browserBundleIds.has(w.appBundleId),
  );

  // Group browser tabs by window
  const tabsByWindow = new Map<string, BrowserTab[]>();
  for (const tab of browserTabs) {
    const key = `${tab.bundleId}-${tab.windowIndex}`;
    const group = tabsByWindow.get(key);
    if (group) {
      group.push(tab);
    } else {
      tabsByWindow.set(key, [tab]);
    }
  }

  return (
    <List>
      <List.Section title="Groups">
        {groups.map((group) => (
          <List.Item
            key={group.id}
            title={group.name}
            subtitle={
              group.windows.length > 0
                ? group.windows.map((w) => w.appName).join(", ")
                : "No windows configured"
            }
            accessories={[
              ...(group.restoreLayout ? [{ tag: "Layout" }] : []),
              ...(group.relaunchApps ? [{ tag: "Relaunch" }] : []),
            ]}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Summon Group"
                  icon={Icon.ArrowRight}
                  onAction={() => handleSummon(group)}
                />
                <Action
                  title="Edit Group"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<GroupForm editGroup={group} onSaved={reload} />)
                  }
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                {group.restoreLayout && (
                  <Action
                    title="Snapshot Layout"
                    icon={Icon.Camera}
                    onAction={() => handleSnapshot(group)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                )}
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  onAction={() => handleReorder(group.id, "up")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  onAction={() => handleReorder(group.id, "down")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                />
                <Action
                  title="Delete Group"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(group)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Open Windows">
        {nonBrowserWindows.map((win) => {
          const appPath = appPaths.get(win.appBundleId);
          return (
            <List.Item
              key={String(win.windowId)}
              title={win.windowTitle || win.appName}
              subtitle={win.windowTitle ? win.appName : undefined}
              icon={appPath ? { fileIcon: appPath } : Icon.AppWindow}
              keywords={[win.appName, win.windowTitle]}
              actions={
                <ActionPanel>
                  <Action
                    title="Switch to Window"
                    icon={Icon.ArrowRight}
                    onAction={() => handleRaiseApp(win)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {[...tabsByWindow.entries()].map(([windowKey, tabs]) => {
          const first = tabs[0];
          const appPath = appPaths.get(first.bundleId);
          const windowNum = first.windowIndex + 1;
          const browserCount = new Set(
            [...tabsByWindow.keys()].filter((k) =>
              k.startsWith(first.bundleId + "-"),
            ),
          ).size;
          const windowName = first.windowName;
          const windowLabel = windowName
            ? windowName
            : browserCount > 1
              ? `Window ${windowNum}`
              : first.appName;
          return (
            <List.Item
              key={`bw-${windowKey}`}
              title={windowLabel}
              subtitle={
                windowName || browserCount > 1 ? first.appName : undefined
              }
              icon={appPath ? { fileIcon: appPath } : Icon.Globe}
              accessories={[{ text: `${tabs.length} tabs` }]}
              keywords={[
                first.appName,
                windowName || "",
                `window ${windowNum}`,
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Switch to Window"
                    icon={Icon.ArrowRight}
                    onAction={() => handleFocusBrowserWindow(first)}
                  />
                  <Action
                    title="Close Window"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={() => handleCloseBrowserWindow(first)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {[...tabsByWindow.entries()].map(([windowKey, tabs]) => {
        const first = tabs[0];
        const appPath = appPaths.get(first.bundleId);
        const windowNum = first.windowIndex + 1;
        const browserCount = new Set(
          [...tabsByWindow.keys()].filter((k) =>
            k.startsWith(first.bundleId + "-"),
          ),
        ).size;
        const windowName = first.windowName;
        const title = windowName
          ? `${first.appName} — ${windowName}`
          : browserCount > 1
            ? `${first.appName} — Window ${windowNum}`
            : first.appName;

        return (
          <List.Section
            key={windowKey}
            title={title}
            subtitle={`${tabs.length} tabs`}
          >
            {tabs.map((tab) => {
              const domain = getDomain(tab.url);
              return (
                <List.Item
                  key={`${tab.bundleId}-${tab.windowIndex}-${tab.tabIndex}`}
                  title={tab.title || domain || "Untitled"}
                  subtitle={domain}
                  icon={appPath ? { fileIcon: appPath } : Icon.Globe}
                  keywords={[tab.appName, tab.title, domain].filter(Boolean)}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Switch to Tab"
                        icon={Icon.ArrowRight}
                        onAction={() => handleSwitchTab(tab)}
                      />
                      <Action
                        title="Close Tab"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={() => handleCloseTab(tab)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
