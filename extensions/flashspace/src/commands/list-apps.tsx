import { Action, ActionPanel, closeMainWindow, getApplications, Icon, List, showHUD } from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getFlashspacePath, parseApps, parseLines } from "../utils/cli";
import { getAppIcon, openApplicationAsync } from "../utils/apps";

export default function ListApps() {
  const flashspace = getFlashspacePath();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | undefined>(undefined);

  const { data: workspaces } = useExec(flashspace, ["list-workspaces"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  const { data: activeWorkspace } = useExec(flashspace, ["get-workspace"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active workspace" },
  });

  // Use active workspace as default when not yet selected
  const effectiveWorkspace = selectedWorkspace !== undefined ? selectedWorkspace : activeWorkspace || "";

  const {
    isLoading,
    data: apps,
    revalidate,
  } = useExec(flashspace, ["list-apps", effectiveWorkspace, "--with-bundle-id"], {
    execute: effectiveWorkspace.length > 0,
    parseOutput: ({ stdout }) => parseApps(stdout),
    failureToastOptions: { title: "Failed to list apps" },
  });

  const { data: installedApps } = usePromise(getApplications);

  async function handleOpenApp(app: { name: string; bundleId?: string }) {
    try {
      await openApplicationAsync(app, installedApps);
      await closeMainWindow();
    } catch {
      await showHUD(`Failed to open "${app.name}"`);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search apps..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Workspace"
          value={effectiveWorkspace}
          onChange={(value) => setSelectedWorkspace(value)}
        >
          {workspaces?.map((ws) => (
            <List.Dropdown.Item key={ws} title={ws + (ws === activeWorkspace ? " (Active)" : "")} value={ws} />
          ))}
        </List.Dropdown>
      }
    >
      {!effectiveWorkspace ? (
        <List.EmptyView title="No Workspaces" description="No workspaces found" />
      ) : (
        apps?.map((app) => (
          <List.Item
            key={app.bundleId || app.name}
            title={app.name}
            subtitle={app.bundleId}
            icon={getAppIcon(installedApps, app)}
            actions={
              <ActionPanel>
                <Action title="Open App" icon={Icon.Eye} onAction={() => handleOpenApp(app)} />
                <Action.CopyToClipboard title="Copy App Name" content={app.name} />
                {app.bundleId && <Action.CopyToClipboard title="Copy Bundle ID" content={app.bundleId} />}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
