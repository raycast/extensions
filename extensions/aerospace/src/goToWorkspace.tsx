import { Action, ActionPanel, List, Toast, closeMainWindow, popToRoot, showToast } from "@raycast/api";
import { spawnSync } from "child_process";
import { getConfig, handleConfigError } from "./utils/config";
import { env } from "./utils/appSwitcher";

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

  // Build the shortcut map directly from raw config bindings instead of using
  // extractKeyboardShortcuts, which replaces dashes with spaces in descriptions
  // and would cause "my-project" to never match "my project".
  const workspaceShortcuts: Record<string, string> = {};

  if (config.mode) {
    for (const mode of Object.keys(config.mode)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bindings: Record<string, any> | undefined = config.mode[mode]?.binding as any;
      if (bindings) {
        for (const key of Object.keys(bindings)) {
          const raw = bindings[key];
          const command: string = Array.isArray(raw) ? String(raw[0]) : typeof raw === "string" ? raw : "";

          if (command.startsWith("workspace ")) {
            const workspaceName = command.slice("workspace ".length).trim();
            if (!workspaceShortcuts[workspaceName]) {
              workspaceShortcuts[workspaceName] = key;
            }
          }
        }
      }
    }
  }

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
