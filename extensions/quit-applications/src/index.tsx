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

async function getRunningAppsPaths(): Promise<string[]> {
  const result = await runAppleScript(`
    set appPaths to {}
    tell application "System Events"
      repeat with aProcess in (get file of every process whose background only is false)
        set processPath to POSIX path of aProcess
        set end of appPaths to processPath
      end repeat
    end tell

    return appPaths
  `);

  return result.split(", ").map((appPath: string) => appPath.trim());
}

function quitApp(app: string) {
  return runAppleScript(`try
  tell application "${app}" to quit
  on error error_message number error_number
      if error_number is equal to -128 then
      -- the user cancelled the action. no need to error
      else
          display dialog error_message
      end if
end try`);
}

function restartApp(app: string) {
  return runAppleScript(`tell application "${app}"
                            repeat while its running
                              quit
                              delay 0.5
	                          end repeat
	                          activate
                        end tell`);
}

function quitAppWithToast(app: string): boolean {
  try {
    quitApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Quit ${app}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to quit ${app}`,
    });
    return false;
  }
}

function restartAppWithToast(app: string): boolean {
  try {
    restartApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Restarted ${app}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to restart ${app}`,
    });
    return false;
  }
}

function getQuickLinkForApp(appName: string, action: string): string {
  const context = JSON.stringify({ appName, action });
  const encodedContext = encodeURIComponent(context);
  return `raycast://extensions/mackopes/quit-applications/index?context=${encodedContext}`;
}

type CommandProps = {
  launchContext?: { appName: string; action: string /* quit | restart */ };
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
      const { appName, action } = launchContext;

      if (action === "quit") {
        quitAppWithToast(appName);
      } else if (action === "restart") {
        restartAppWithToast(appName);
      }
      return;
    }

    getRunningAppsPaths().then((appCandidatePaths) => {
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

      setIsLoading(false);
    });
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

                  for (const app of apps) {
                    if (
                      preferences.excludeApplications
                        .split(",")
                        .map((name: string) => name.trim())
                        .includes(app.name)
                    ) {
                      continue;
                    }

                    const success = await quitAppWithToast(app.name);

                    if (success) {
                      remainingApps = remainingApps.filter((a) => a.name !== app.name);
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
          key={app.name}
          id={app.path}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action
                title="Quit"
                onAction={() => {
                  const success = quitAppWithToast(app.name);

                  if (success) {
                    const removedAppIndex = apps.findIndex((a) => a.name === app.name);
                    setApps((apps) => apps.toSpliced(removedAppIndex, 1));
                  }

                  if (searchText) {
                    clearSearchBar();
                  }
                }}
              />
              <Action title="Restart" onAction={() => restartAppWithToast(app.name)} />
              <Action.CreateQuicklink
                title="Create Quit Quicklink"
                quicklink={{ link: getQuickLinkForApp(app.name, "quit"), name: `Quit ${app.name}` }}
              />
              <Action.CreateQuicklink
                title="Create Restart Quicklink"
                quicklink={{ link: getQuickLinkForApp(app.name, "restart"), name: `Restart ${app.name}` }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
