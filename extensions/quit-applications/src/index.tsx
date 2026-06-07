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
import { runAppleScript } from "@raycast/utils";
import { execSync } from "child_process";

const APPLESCRIPT_TIMEOUT_MS = 5000;
const RESTART_APPLESCRIPT_TIMEOUT_MS = 15000;

function applicationNameFromPath(path: string): string {
  /* Example:
   * '/Applications/Visual Studio Code.app' -> 'Visual Studio Code'
   */
  const pathParts = path.split("/");
  const appName = pathParts[pathParts.length - 1];
  if (!appName) {
    throw new Error("appName not found");
  }
  return appName.replace(".app", "");
}

/**
 * Escapes a string to be safe for interpolation inside AppleScript double quotes
 */
function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
        const appPath = match[1];
        // Exclude system services and helper processes in /System/Library/
        if (appPath.startsWith("/System/Library/")) {
          continue;
        }
        // Exclude helper/system items in /Library/
        if (appPath.startsWith("/Library/")) {
          continue;
        }
        // Exclude internal helpers inside application bundles (e.g. appName.app/Contents/Frameworks/helper.app)
        if (appPath.includes(".app/Contents/")) {
          continue;
        }
        appSet.add(appPath);
      }
    }

    return Array.from(appSet);
  };

  try {
    const result = await runAppleScript(
      `
      use AppleScript version "2.4"
      use framework "Foundation"
      use framework "AppKit"
      use scripting additions

      set theWorkspace to current application's NSWorkspace's sharedWorkspace()
      set runningApps to theWorkspace's runningApplications()

      set thePredicate to current application's NSPredicate's predicateWithFormat:"activationPolicy == 0"
      set regularApps to runningApps's filteredArrayUsingPredicate:thePredicate

      set appPaths to {}
      repeat with anApp in (regularApps as list)
        try
          set bundleURL to anApp's bundleURL()
          if bundleURL is not missing value then
            set end of appPaths to (bundleURL's |path|()) as text
          end if
        end try
      end repeat

      set AppleScript's text item delimiters to linefeed
      return appPaths as text
      `,
      { timeout: APPLESCRIPT_TIMEOUT_MS },
    );

    return result
      .split("\n")
      .map((appPath: string) => appPath.trim())
      .filter(Boolean);
  } catch (error: unknown) {
    // Attempt fallback for ANY failure of AppleScript execution for maximum resilience
    try {
      const fallbackPaths = getRunningAppsPathsWithPs();
      if (fallbackPaths.length > 0) {
        return fallbackPaths;
      }
    } catch {
      // Ignore and throw original error below if fallback fails as well
    }
    throw error;
  }
}

function quitApp(app: string) {
  return runAppleScript(
    `try
  tell application "${escapeAppleScriptString(app)}" to quit
  on error error_message number error_number
      if error_number is equal to -128 then
      -- the user cancelled the action. no need to error
      else
          display dialog error_message
      end if
end try`,
    { timeout: APPLESCRIPT_TIMEOUT_MS },
  );
}

function restartApp(app: string) {
  return runAppleScript(
    `tell application "${escapeAppleScriptString(app)}"
                            repeat while its running
                              quit
                              delay 0.5
	                          end repeat
	                          activate
                        end tell`,
    { timeout: RESTART_APPLESCRIPT_TIMEOUT_MS },
  );
}

async function quitAppWithToast(app: string, displayName = app): Promise<boolean> {
  try {
    await quitApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Quit ${displayName}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to quit ${displayName}`,
    });
    return false;
  }
}

async function restartAppWithToast(app: string, displayName = app): Promise<boolean> {
  try {
    await restartApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Restarted ${displayName}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to restart ${displayName}`,
    });
    return false;
  }
}

function getQuickLinkForApp(appPath: string, appName: string, action: string): string {
  const context = JSON.stringify({ appPath, appName, action });
  const encodedContext = encodeURIComponent(context);
  return `raycast://extensions/mackopes/quit-applications/index?context=${encodedContext}`;
}

type CommandProps = {
  launchContext?: { appPath?: string; appName: string; action: string /* quit | restart */ };
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
    if (launchContext && launchContext.action) {
      const { appPath, appName, action } = launchContext;
      const target = appPath || appName;

      if (action === "quit") {
        void quitAppWithToast(target, appName);
      } else if (action === "restart") {
        void restartAppWithToast(target, appName);
      }
      return;
    }

    const loadApps = async () => {
      try {
        const appCandidatePaths = await getRunningAppsPaths();
        const mappedApps = appCandidatePaths
          .filter((path) => path.endsWith(".app"))
          .map((path) => ({ name: applicationNameFromPath(path), path }));

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
                  const excludedNames = preferences.excludeApplications ? preferences.excludeApplications : "";
                  const excludedList = excludedNames
                    .split(",")
                    .map((name: string) => name.trim().toLowerCase())
                    .filter(Boolean);

                  for (const app of apps) {
                    if (excludedList.includes(app.name.toLowerCase())) {
                      continue;
                    }

                    // Pass path for accurate targetting, name for the toast display
                    const success = await quitAppWithToast(app.path, app.name);

                    if (success) {
                      remainingApps = remainingApps.filter((a) => a.path !== app.path);
                    }
                  }

                  setApps(remainingApps);

                  if (searchText) {
                    clearSearchBar();
                  }

                  if (remainingApps.length === 0) {
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
                  // Pass path for accurate targetting, name for the toast display
                  const success = await quitAppWithToast(app.path, app.name);

                  if (success) {
                    setApps((apps) => apps.filter((a) => a.path !== app.path));
                  }

                  if (searchText) {
                    clearSearchBar();
                  }
                }}
              />
              <Action
                title="Restart"
                onAction={async () => {
                  // Pass path for accurate targetting, name for the toast display
                  await restartAppWithToast(app.path, app.name);
                }}
              />
              <Action.CreateQuicklink
                title="Create Quit Quicklink"
                quicklink={{ link: getQuickLinkForApp(app.path, app.name, "quit"), name: `Quit ${app.name}` }}
              />
              <Action.CreateQuicklink
                title="Create Restart Quicklink"
                quicklink={{ link: getQuickLinkForApp(app.path, app.name, "restart"), name: `Restart ${app.name}` }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
