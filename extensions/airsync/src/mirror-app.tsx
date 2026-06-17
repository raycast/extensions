import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getApps, mirrorApp, connectAdb, App } from "./utils/applescript";
import React, { useEffect } from "react";

export default function Command() {
  const { data: appsData, isLoading, error, revalidate } = usePromise(getApps);

  // Show toast and close window on error
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to get apps",
        message: error.message,
      });
    }
  }, [error]);

  const handleMirrorApp = async (app: App) => {
    try {
      const response = await mirrorApp(app.package_name);

      if (response.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Launching App Mirror",
          message: response.message,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to mirror app",
          message: response.message,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to mirror app",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleConnectAdb = async () => {
    try {
      const response = await connectAdb();

      if (response === "Connected") {
        await showToast({
          style: Toast.Style.Success,
          title: "ADB Connected",
          message: response,
        });
        // Refresh the apps list after connecting
        revalidate();
      } else if (response === "ADB connection already in progress") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Connecting",
          message: response,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to connect ADB",
          message: response,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect ADB",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading apps..." />;
  }

  if (!appsData || appsData.apps.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No Apps Found"
          description="No apps available for mirroring"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Sort apps: non-system apps first, then by name
  const sortedApps = [...appsData.apps].sort((a, b) => {
    if (a.system_app !== b.system_app) {
      return a.system_app ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps..." isShowingDetail>
      {sortedApps.map((app: App) => {
        const appIcon = app.icon ? `data:image/png;base64,${app.icon}` : Icon.AppWindow;

        const isSystemApp = app.system_app;

        return (
          <List.Item
            icon={appIcon}
            title={app.name}
            detail={
              <List.Item.Detail
                markdown={`# ${app.name}\n\n${app.package_name}\n\n${isSystemApp ? "🔧 System App" : "📱 User App"}`}
              />
            }
            actions={
              <ActionPanel>
                <Action title="Mirror App" icon={Icon.Monitor} onAction={() => handleMirrorApp(app)} />
                <Action
                  title="Connect Adb"
                  icon={Icon.Link}
                  onAction={handleConnectAdb}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
                <Action.CopyToClipboard
                  title="Copy Package Name"
                  content={app.package_name}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  onAction={revalidate}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
