import { ActionPanel, Action, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execSync } from "child_process";
import { useState } from "react";

interface App {
  name: string;
  bundleId: string;
  iconPath?: string;
}

async function fetchApps(): Promise<App[]> {
  try {
    const script = `
      tell application "System Events"
        set appList to {}
        repeat with proc in (get processes whose (visible is true) and (background only is false))
          try
            set procName to name of proc
            set procBundle to bundle identifier of proc
            if procBundle is not missing value and procBundle is not "" then
              -- Get the application file path for icon
              try
                set appFile to file of proc
                set appPath to POSIX path of appFile
                set end of appList to (procName & "|||" & procBundle & "|||" & appPath)
              on error
                set end of appList to (procName & "|||" & procBundle & "|||")
              end try
            end if
          end try
        end repeat
        return appList
      end tell
    `;

    const result = execSync(`osascript -e '${script.replace(/'/g, "\\'")}'`, {
      encoding: "utf8",
      timeout: 10000,
    });

    const lines = result.trim().split(", ");
    const apps: App[] = [];

    for (const line of lines) {
      const parts = line.split("|||");
      if (parts.length >= 2) {
        const [name, bundleId, appPath] = parts;
        apps.push({
          name: name.trim(),
          bundleId: bundleId.trim(),
          iconPath: appPath?.trim(),
        });
      }
    }

    // Filter out system apps for safety
    const systemApps = ["com.apple.finder", "com.apple.dock", "com.apple.systemuiserver"];
    return apps.filter((app) => !systemApps.includes(app.bundleId));
  } catch (error) {
    console.error("Failed to fetch apps:", error);
    throw new Error("Failed to fetch running applications. Please ensure accessibility permissions are granted.");
  }
}

async function quitApp(bundleId: string): Promise<void> {
  try {
    const script = `tell application id "${bundleId}" to quit saving yes`;
    execSync(`osascript -e '${script}'`, { timeout: 5000 });
  } catch (error) {
    console.error(`Failed to quit app ${bundleId}:`, error);
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

  const toggleSelection = (bundleId: string) => {
    setSelected((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(bundleId)) {
        newSelected.delete(bundleId);
      } else {
        newSelected.add(bundleId);
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

    const selectedApps = apps.filter((app) => selected.has(app.bundleId));
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
        await quitApp(app.bundleId);
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
        const isSelected = selected.has(app.bundleId);

        return (
          <List.Item
            key={app.bundleId}
            icon={{ fileIcon: app.iconPath || Icon.Desktop }}
            title={app.name}
            accessories={isSelected ? [{ icon: Icon.CheckCircle, tooltip: "Selected" }] : [{ icon: Icon.Circle }]}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Unselect App" : "Select App"}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() => toggleSelection(app.bundleId)}
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
