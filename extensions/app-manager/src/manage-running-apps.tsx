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
import { showFailureToast, useCachedPromise, runAppleScript } from "@raycast/utils";
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

// Simple cache to prevent duplicate calls in development
let appCache: { data: App[]; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds

async function fetchApps(): Promise<App[]> {
  // Check cache first to prevent duplicate calls in React strict mode
  if (appCache && Date.now() - appCache.timestamp < CACHE_DURATION) {
    return appCache.data;
  }
  try {
    // Run both operations in parallel for better performance
    const [installedAppsResult, runningProcessesResult] = await Promise.all([
      // Get all installed applications from Raycast API
      getApplications(),

      // Get running processes with their bundle IDs (optimized AppleScript)
      runAppleScript(
        `
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
      `,
      ),
    ]);

    // Create a map of bundle IDs to applications for quick lookup
    const appMap = new Map<string, Application>();
    installedAppsResult.forEach((app) => {
      if (app.bundleId) {
        appMap.set(app.bundleId, app);
      }
    });

    const runningBundleIds = runningProcessesResult
      .trim()
      .split(", ")
      .map((id) => id.trim())
      .filter((id) => id && id !== "");

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

    const filteredApps = apps.filter((app) => !systemApps.includes(app.bundleId));

    // Cache the results
    appCache = {
      data: filteredApps,
      timestamp: Date.now(),
    };

    return filteredApps;
  } catch {
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
      await showFailureToast("No apps selected", { title: "Please select apps to quit first" });
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
    // Clear cache before revalidating for fresh data
    appCache = null;
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
      <List searchBarPlaceholder="Search running applications...">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Applications"
          description={error.message || "Please ensure accessibility permissions are granted in System Preferences"}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => {
                  appCache = null;
                  revalidate();
                }}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Search running applications..." />;
  }

  if (apps.length === 0) {
    return (
      <List searchBarPlaceholder="Search running applications...">
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="No Applications Running"
          description="No visible GUI applications are currently running on your Mac"
          actions={
            <ActionPanel>
              <Action
                title="Refresh App List"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  appCache = null;
                  revalidate();
                }}
              />
            </ActionPanel>
          }
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
            accessories={
              isSelected
                ? [{ icon: Icon.CheckCircle, tooltip: "Selected for quitting" }]
                : [{ icon: Icon.Circle, tooltip: "Not selected" }]
            }
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect App" : "Select App"}
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
                    title="Select All Apps"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => {
                      const allIds = new Set(apps.map((app) => app.uniqueId));
                      setSelected(allIds);
                    }}
                  />
                  <Action
                    title="Deselect All Apps"
                    icon={Icon.Circle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    onAction={() => setSelected(new Set())}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh App List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      appCache = null;
                      revalidate();
                    }}
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
