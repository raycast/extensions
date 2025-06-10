import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getApplications,
  Application,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execSync } from "child_process";
import { useState } from "react";

interface App {
  name: string;
  bundleId: string;
  path: string;
  uniqueId: string;
  windowId?: number;
  isWebApp?: boolean;
  windowTitle?: string;
}

const preferredAppsNames = {
  "com.google.Chrome": "Google Chrome",
  "com.apple.Safari": "Safari",
  "com.microsoft.Edge": "Microsoft Edge",
  "com.google.Chrome.app": "Google Chrome",
  "com.microsoft.VSCode": "Visual Studio Code",
  "com.microsoft.VSCodeInsiders": "Visual Studio Code Insiders",
  "com.microsoft.VSCode.app": "Visual Studio Code",
  "com.microsoft.VSCodeInsiders.app": "Visual Studio Code Insiders",
  "com.microsoft.VSCode.app.nightly": "Visual Studio Code Nightly",
  "com.microsoft.VSCodeInsiders.app.nightly": "Visual Studio Code Insiders Nightly",
  "com.microsoft.VSCode.app.insiders": "Visual Studio Code Insiders",
};

async function fetchApps(): Promise<App[]> {
  try {
    // Get all installed applications from Raycast API
    const installedApps = await getApplications();
    const appMap = new Map<string, Application>();

    // Create a map of bundle IDs to applications for quick lookup
    installedApps.forEach((app) => {
      if (app.bundleId) {
        appMap.set(app.bundleId, app);
      }
    });
    // Get running processes with their bundle IDs
    const processScript = `
      tell application "System Events"
        set appList to {}
        repeat with proc in (every process whose background only is false)  
          try
            set procBundle to bundle identifier of proc
            if procBundle is not missing value and procBundle is not "" then
              set end of appList to procBundle
            end if
          end try
        end repeat
        return appList
      end tell
    `;

    const result = execSync(`osascript -e '${processScript.replace(/'/g, "\\'")}'`, {
      encoding: "utf8",
      timeout: 10000,
    });

    const runningBundleIds = result
      .trim()
      .split(", ")
      .map((id) => id.trim());
    const apps: App[] = [];
    let uniqueCounter = 0;

    // Process each running bundle ID
    for (const bundleId of runningBundleIds) {
      if (!bundleId) continue;

      const installedApp = appMap.get(bundleId);
      // Regular app - use information from getApplications
      if (installedApp) {
        apps.push({
          name: preferredAppsNames[bundleId as keyof typeof preferredAppsNames] || installedApp.name,
          bundleId: bundleId,
          path: installedApp.path,
          uniqueId: `${bundleId}_${uniqueCounter++}`,
          isWebApp: false,
        });
      }
    }

    // Filter out system apps for safety
    const systemApps = [
      "com.apple.finder",
      "com.apple.dock",
      "com.apple.systemuiserver",
      "com.apple.WindowManager",
      "com.apple.controlcenter",
    ];

    return apps.filter((app) => !systemApps.includes(app.bundleId));
  } catch (error) {
    console.error("Failed to fetch apps:", error);
    throw new Error("Failed to fetch running applications. Please ensure accessibility permissions are granted.");
  }
}

async function quitApp(app: App): Promise<void> {
  try {
    if (app.isWebApp && app.windowId) {
      // Close specific window for web apps
      const titleToMatch = app.windowTitle || app.name;
      const script = `
        tell application "System Events"
          set proc to first process whose bundle identifier is "${app.bundleId}"
          try
            set targetWindow to first window of proc whose id is ${app.windowId}
            click button 1 of targetWindow
          on error
            -- Fallback to closing any window with matching title
            try
              set targetWindow to first window of proc whose name contains "${titleToMatch.replace(/"/g, '\\"')}"
              click button 1 of targetWindow
            on error
              -- Final fallback - quit the entire app if no other windows
              tell application id "${app.bundleId}" to quit saving yes
            end try
          end try
        end tell
      `;
      execSync(`osascript -e '${script.replace(/'/g, "\\'")}'`, { timeout: 5000 });
    } else {
      // Quit entire app for regular apps
      const script = `tell application id "${app.bundleId}" to quit saving yes`;
      execSync(`osascript -e '${script}'`, { timeout: 5000 });
    }
  } catch (error) {
    console.error(`Failed to quit app ${app.bundleId}:`, error);
    throw error;
  }
}

export default function Command() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const {
    data: apps = [],
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchApps, [], {
    initialData: [],
    keepPreviousData: true,
  });
  const toggleSelection = (uniqueId: string) => {
    setSelected((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(uniqueId)) {
        newSelected.delete(uniqueId);
      } else {
        newSelected.add(uniqueId);
      }
      return newSelected;
    });
  };

  const quitSelectedApps = async () => {
    if (selected.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No apps selected",
        message: "Please select apps to quit first",
      });
      return;
    }

    const selectedApps = apps.filter((app) => selected.has(app.uniqueId));
    const appNames = selectedApps.map((app) => app.name).join(", ");

    const confirmed = await confirmAlert({
      title: `Quit ${selected.size} app${selected.size > 1 ? "s" : ""}?`,
      message: `Are you sure you want to quit: ${appNames}`,
      primaryAction: {
        title: "Quit Apps",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Quitting apps...",
    });

    let successCount = 0;
    const errors: string[] = [];

    for (const app of selectedApps) {
      try {
        await quitApp(app);
        successCount++;
      } catch {
        errors.push(app.name);
      }
    }

    setSelected(new Set());
    await revalidate();

    if (errors.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Successfully quit ${successCount} app${successCount > 1 ? "s" : ""}`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Quit ${successCount} apps, ${errors.length} failed`;
      toast.message = `Failed to quit: ${errors.join(", ")}`;
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Apps"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading applications..." />;
  }
  if (apps.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="No GUI Applications Running"
          description="No visible applications are currently running"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running applications..." isShowingDetail={false}>
      {apps.map((app) => {
        const isSelected = selected.has(app.uniqueId);

        return (
          <List.Item
            key={app.uniqueId}
            icon={{ fileIcon: app.path || Icon.Desktop }}
            title={app.name}
            subtitle={app.isWebApp ? "Web App" : undefined}
            accessories={isSelected ? [{ icon: Icon.CheckCircle, tooltip: "Selected" }] : [{ icon: Icon.Circle }]}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Unselect App" : "Select App"}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() => toggleSelection(app.uniqueId)}
                />
                <Action
                  title="Quit Selected Apps"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={quitSelectedApps}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
