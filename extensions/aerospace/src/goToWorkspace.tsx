import { Action, ActionPanel, List, Toast, closeMainWindow, popToRoot, showToast } from "@raycast/api";
import { spawnSync } from "child_process";
import { getConfig, handleConfigError } from "./utils/config";
import { env } from "./utils/appSwitcher";
import { extractKeyboardShortcuts } from "./utils/shortcuts";

function getWorkspaceNames() {
  const result = spawnSync("aerospace", ["list-workspaces", "--all"], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Failed to list Aerospace workspaces");
  }

  return result.stdout.trim().split("\n").filter(Boolean);
}

function getFocusedWorkspace() {
  const result = spawnSync("aerospace", ["list-workspaces", "--focused"], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Failed to determine focused workspace");
  }

  return result.stdout.trim();
}

function getWorkspaceShortcuts() {
  const { config, error } = getConfig();

  if (error) {
    handleConfigError(error);
    return {};
  }

  if (!config) {
    return {};
  }

  const shortcuts = extractKeyboardShortcuts(config);
  const workspaceShortcuts: Record<string, string> = {};

  Object.values(shortcuts).forEach((shortcut) => {
    if (!shortcut.description.startsWith("workspace ")) {
      return;
    }

    const workspaceName = shortcut.description.slice("workspace ".length).trim();
    if (!workspaceShortcuts[workspaceName]) {
      workspaceShortcuts[workspaceName] = shortcut.shortcut;
    }
  });

  return workspaceShortcuts;
}

async function goToWorkspace(workspaceName: string) {
  const result = spawnSync("aerospace", ["workspace", workspaceName], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.status !== 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to switch workspace",
      message: result.stderr.trim() || workspaceName,
    });
    return;
  }

  popToRoot({ clearSearchBar: true });
  closeMainWindow({ clearRootSearch: true });
}

export default function Command() {
  try {
    const workspaces = getWorkspaceNames();
    const focusedWorkspace = getFocusedWorkspace();
    const workspaceShortcuts = getWorkspaceShortcuts();

    return (
      <List navigationTitle="Go to Workspace" searchBarPlaceholder="Search workspaces">
        {workspaces.map((workspaceName) => (
          <List.Item
            key={workspaceName}
            title={workspaceName}
            subtitle={workspaceShortcuts[workspaceName]}
            accessories={focusedWorkspace === workspaceName ? [{ tag: "focused" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Go to Workspace"
                  onAction={async () => {
                    await goToWorkspace(workspaceName);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Aerospace error";
    showToast({
      style: Toast.Style.Failure,
      title: "Aerospace Error",
      message,
    });

    return <List navigationTitle="Go to Workspace" />;
  }
}
