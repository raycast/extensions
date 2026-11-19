import React, { useEffect, useState } from "react";
import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  clearSearchBar,
  getPreferenceValues,
  Icon,
  popToRoot,
} from "@raycast/api";
import { createDeeplink, DeeplinkType, runAppleScript } from "@raycast/utils";
import { execSync } from "child_process";

const APPLESCRIPT_TIMEOUT_MS = 5000;
const RESTART_APPLESCRIPT_TIMEOUT_MS = 15000;
const QUIT_POLL_INTERVAL_MS = 200;

type RunningApp = {
  name: string;
  path?: string;
};

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function applicationNameFromPath(path: string): string {
  /* Example:
   * '/Applications/Visual Studio Code.app' -> 'Visual Studio Code'
   */

  const pathParts = path.split("/");
  const appName = pathParts[pathParts.length - 1];
  if (!appName) {
    throw new Error("appName not found");
  }
  return appName.replace(/\.app$/, "");
}

async function getRunningAppsPaths(): Promise<string[]> {
  const getRunningAppsPathsWithPs = () => {
    const outputLines = execSync("/bin/ps -axo comm | /usr/bin/grep -E '.app/Contents/MacOS/' || true")
      .toString()
      .split("\n")
      .filter(Boolean);

    const appSet = new Set<string>();
    for (const line of outputLines) {
      const match = line.match(/(.+\.app)\/Contents\/MacOS\//);
      if (match && match[1]) {
        appSet.add(match[1]);
      }
    }

    return Array.from(appSet);
  };

  try {
    // Discover running apps via NSWorkspace (a local Cocoa API that needs no Automation
    // permission). Unlike System Events' `background only is false`, this includes menu-bar /
    // accessory apps (LSUIElement). We then filter to apps a user would want to quit:
    //   - drop prohibited (background-only daemons / XPC / bare binaries)
    //   - drop nested helper bundles (e.g. "Google Chrome Helper.app")
    //   - regular apps: always keep (Dock apps, including /System/Applications/*)
    //   - accessory apps: keep only those under /Applications or ~/Applications, so third-party
    //     menu-bar utilities show up while Apple's UI agents (Dock, Spotlight, …) stay hidden
    const result = await runAppleScript(
      `ObjC.import('AppKit');
      const home = ObjC.unwrap($.NSHomeDirectory());
      const apps = $.NSWorkspace.sharedWorkspace.runningApplications;
      const count = apps.count;
      const out = [];
      for (let i = 0; i < count; i++) {
        const a = apps.objectAtIndex(i);
        const policy = Number(a.activationPolicy); // 0 regular, 1 accessory, 2 prohibited
        if (policy === 2) continue;
        const url = a.bundleURL;
        if (!url || url.isNil()) continue;
        const path = ObjC.unwrap(url.path);
        if (!path.endsWith('.app')) continue;
        if (path.indexOf('.app/') !== -1) continue; // nested helper bundle
        if (policy === 1 && !(path.startsWith('/Applications/') || path.startsWith(home + '/Applications/'))) continue;
        out.push(path);
      }
      JSON.stringify(out);`,
      { language: "JavaScript", timeout: APPLESCRIPT_TIMEOUT_MS },
    );

    const paths = JSON.parse(result) as string[];
    if (paths.length > 0) {
      return paths;
    }
    // Empty result is unexpected; fall back to ps before giving up.
    return getRunningAppsPathsWithPs();
  } catch (error: unknown) {
    try {
      const fallbackPaths = getRunningAppsPathsWithPs();
      if (fallbackPaths.length > 0) {
        return fallbackPaths;
      }
    } catch {
      // ignore and fall-through to rethrow below
    }
    throw error;
  }
}

function isAppRunning(appPath: string): Promise<boolean> {
  return runAppleScript(
    `ObjC.import('AppKit');
    const targetPath = ${JSON.stringify(appPath)};
    const apps = $.NSWorkspace.sharedWorkspace.runningApplications;
    let running = false;
    for (let i = 0; i < apps.count; i++) {
      const url = apps.objectAtIndex(i).bundleURL;
      if (url && !url.isNil() && ObjC.unwrap(url.path) === targetPath) {
        running = true;
        break;
      }
    }
    JSON.stringify(running);`,
    { language: "JavaScript", timeout: APPLESCRIPT_TIMEOUT_MS },
  ).then((result) => JSON.parse(result) as boolean);
}

async function waitForAppToQuit(appPath: string): Promise<void> {
  const deadline = Date.now() + APPLESCRIPT_TIMEOUT_MS;

  while (await isAppRunning(appPath)) {
    if (Date.now() >= deadline) {
      throw new Error("Application did not quit before the timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, QUIT_POLL_INTERVAL_MS));
  }
}

async function quitApp(app: RunningApp) {
  const target = escapeAppleScriptString(app.path ?? app.name);
  await runAppleScript(`tell application "${target}" to quit`, { timeout: APPLESCRIPT_TIMEOUT_MS });

  if (app.path) {
    await waitForAppToQuit(app.path);
  }
}

function restartApp(app: RunningApp) {
  const target = escapeAppleScriptString(app.path ?? app.name);
  return runAppleScript(
    `tell application "${target}"
                            repeat while its running
                              quit
                              delay 0.5
	                          end repeat
	                          activate
                        end tell`,
    { timeout: RESTART_APPLESCRIPT_TIMEOUT_MS },
  );
}

async function quitAppWithToast(app: RunningApp): Promise<boolean> {
  try {
    await quitApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Quit ${app.name}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to quit ${app.name}`,
    });
    return false;
  }
}

async function restartAppWithToast(app: RunningApp): Promise<boolean> {
  try {
    await restartApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Restarted ${app.name}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to restart ${app.name}`,
    });
    return false;
  }
}

function getQuickLinkForApp(app: Required<RunningApp>, action: string): string {
  return createDeeplink({
    type: DeeplinkType.Extension,
    command: "index",
    context: { appName: app.name, appPath: app.path, action },
  });
}

type CommandProps = {
  launchContext?: { appName: string; appPath?: string; action: string /* quit | restart */ };
};

export default function Command({ launchContext }: CommandProps) {
  const preferences = getPreferenceValues();
  const [apps, setApps] = useState<
    {
      name: string;
      path: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  useEffect(() => {
    if (launchContext && launchContext.appName && launchContext.action) {
      const { appName, appPath, action } = launchContext;
      const app = { name: appName, path: appPath };

      if (action === "quit") {
        void quitAppWithToast(app);
      } else if (action === "restart") {
        void restartAppWithToast(app);
      }
      return;
    }

    const loadApps = async () => {
      try {
        const appCandidatePaths = await getRunningAppsPaths();
        const mappedApps = appCandidatePaths.map((path) => ({ name: applicationNameFromPath(path), path }));

        const excludedNames = preferences.excludeApplications
          ? preferences.excludeApplications.split(",").map((name: string) => name.trim().toLowerCase())
          : [];

        const filteredApps = mappedApps.filter((app) => !excludedNames.includes(app.name.toLowerCase()));

        const uniqueApps: { name: string; path: string }[] = [];
        const seenPaths = new Set<string>();

        for (const app of filteredApps) {
          if (!seenPaths.has(app.path)) {
            seenPaths.add(app.path);
            uniqueApps.push(app);
          }
        }

        setApps(uniqueApps);

        if (uniqueApps && uniqueApps[0]) {
          setSelectedId(uniqueApps[0].path);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Unable to load applications",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadApps();
  }, []);

  return (
    <List
      isLoading={isLoading}
      selectedItemId={selectedId ?? undefined}
      filtering={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id)}
    >
      {preferences.showQuitAllApplications && (
        <List.Item
          title="Quit All Applications"
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Quit All"
                onAction={async () => {
                  let remainingApps = [...apps];

                  // Excluded apps were already removed from `apps` at load time (loadApps),
                  // so every entry here is safe to quit.
                  for (const app of apps) {
                    const success = await quitAppWithToast(app);

                    if (success) {
                      remainingApps = remainingApps.filter((a) => a.path !== app.path);
                    }
                  }

                  setApps(remainingApps);

                  if (searchText) {
                    clearSearchBar();
                  }

                  if (remainingApps.length == 0) {
                    popToRoot({ clearSearchBar: true });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {apps.map((app) => (
        <List.Item
          title={app.name}
          key={app.path}
          id={app.path}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action
                title="Quit"
                onAction={async () => {
                  const success = await quitAppWithToast(app);

                  if (success) {
                    setApps((prev) => prev.filter((a) => a.path !== app.path));
                  }

                  if (searchText) {
                    clearSearchBar();
                  }
                }}
              />
              <Action
                title="Restart"
                onAction={async () => {
                  await restartAppWithToast(app);
                }}
              />
              <Action.CreateQuicklink
                title="Create Quit Quicklink"
                quicklink={{ link: getQuickLinkForApp(app, "quit"), name: `Quit ${app.name}` }}
              />
              <Action.CreateQuicklink
                title="Create Restart Quicklink"
                quicklink={{ link: getQuickLinkForApp(app, "restart"), name: `Restart ${app.name}` }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
