import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { type Application } from "@raycast/api";
import path from "path";
import { useCallback, useEffect, useState } from "react";

import AddWorkspaceForm from "@/components/AddWorkspaceForm";
import SelectEditor from "@/components/SelectEditor";
import { App } from "@/types";
import { isGitAvailable } from "@/utils/git";
import {
  getStoredApp,
  getStoredTerminalApp,
  getStoredWorkspaces,
  getWorkspaceApps,
  saveStoredTerminalApp,
  saveStoredWorkspaces,
  saveWorkspaceApps,
} from "@/utils/storage";

interface SettingsProps {
  onWorkspacesChanged?: () => Promise<void>;
  showGeneral?: boolean;
}

export default function Settings({ onWorkspacesChanged, showGeneral = true }: SettingsProps) {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [defaultApp, setDefaultApp] = useState<App | null>(null);
  const [terminalApp, setTerminalApp] = useState<App | null>(null);
  const [workspaceApps, setWorkspaceApps] = useState<Record<string, App>>({});
  const [gitAvailable, setGitAvailable] = useState<boolean | null>(null);

  const loadSettings = useCallback(async () => {
    const [storedWorkspaces, storedDefaultApp, storedWorkspaceApps, storedTerminalApp, gitInstalled] =
      await Promise.all([
        getStoredWorkspaces(),
        getStoredApp(),
        getWorkspaceApps(),
        getStoredTerminalApp(),
        isGitAvailable(),
      ]);

    setWorkspaces(storedWorkspaces);
    setDefaultApp(storedDefaultApp);
    setWorkspaceApps(storedWorkspaceApps);
    setTerminalApp(storedTerminalApp);
    setGitAvailable(gitInstalled);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function removeWorkspace(workspacePath: string) {
    if (
      await confirmAlert({
        message: `Remove "${path.basename(workspacePath)}" from your workspace projects?`,
        primaryAction: { style: Alert.ActionStyle.Destructive, title: "Remove" },
        title: "Remove Workspace",
      })
    ) {
      try {
        const newWorkspaces = workspaces.filter((item) => item !== workspacePath);

        await saveStoredWorkspaces(newWorkspaces);

        const newWorkspaceApps = { ...workspaceApps };
        delete newWorkspaceApps[workspacePath];

        await saveWorkspaceApps(newWorkspaceApps);

        setWorkspaces(newWorkspaces);
        setWorkspaceApps(newWorkspaceApps);

        if (onWorkspacesChanged) {
          await onWorkspacesChanged();
        }

        await showToast({ style: Toast.Style.Success, title: "Workspace Removed" });
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Failed to remove workspace" });
      }
    }
  }

  async function setWorkspaceApp(workspacePath: string, app: Application) {
    try {
      const newWorkspaceApps = {
        ...workspaceApps,
        [workspacePath]: { bundleId: app.bundleId || "", name: app.name },
      };

      await saveWorkspaceApps(newWorkspaceApps);

      setWorkspaceApps(newWorkspaceApps);

      await showToast({
        message: `${path.basename(workspacePath)} → ${app.name}`,
        style: Toast.Style.Success,
        title: "App Updated",
      });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update app" });
    }
  }

  async function resetWorkspaceApp(workspacePath: string) {
    try {
      const newWorkspaceApps = { ...workspaceApps };
      delete newWorkspaceApps[workspacePath];

      await saveWorkspaceApps(newWorkspaceApps);

      setWorkspaceApps(newWorkspaceApps);

      await showToast({ style: Toast.Style.Success, title: "Application Reset" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to reset app" });
    }
  }

  async function moveWorkspace(index: number, direction: "down" | "up") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workspaces.length) {
      return;
    }

    try {
      const newWorkspaces = [...workspaces];
      const [moved] = newWorkspaces.splice(index, 1);

      newWorkspaces.splice(newIndex, 0, moved);

      await saveStoredWorkspaces(newWorkspaces);

      setWorkspaces(newWorkspaces);

      if (onWorkspacesChanged) {
        await onWorkspacesChanged();
      }

      await showToast({ style: Toast.Style.Success, title: "Workspace Moved" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to move workspace" });
    }
  }

  const handleTerminalSelect = async (app: Application) => {
    await saveStoredTerminalApp({ bundleId: app.bundleId || "", name: app.name });

    setTerminalApp({ bundleId: app.bundleId || "", name: app.name });

    await showToast({ message: app.name, style: Toast.Style.Success, title: "Terminal Updated" });
  };

  const handleTerminalReset = async () => {
    await saveStoredTerminalApp(null);

    setTerminalApp(null);

    await showToast({ style: Toast.Style.Success, title: "Terminal Reset" });
  };

  return (
    <List
      navigationTitle={showGeneral ? "Workspace Settings" : "Manage Your Workspaces"}
      searchBarPlaceholder={showGeneral ? "Search settings..." : "Search for workspaces..."}
    >
      {showGeneral && (
        <List.Section title="General">
          <List.Item
            accessories={[
              {
                tag: {
                  color: defaultApp?.name ? Color.SecondaryText : Color.Red,
                  value: defaultApp?.name || "Not selected",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  onPop={loadSettings}
                  target={<SelectEditor />}
                  title="Change Application"
                />
              </ActionPanel>
            }
            icon={Icon.AppWindow}
            subtitle="Application where your projects are opened"
            title="Default App"
          />
          <List.Item
            accessories={[
              {
                tag: {
                  color: Color.SecondaryText,
                  value: terminalApp?.name || "System default",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  onPop={loadSettings}
                  target={<SelectEditor onReset={handleTerminalReset} onSelect={handleTerminalSelect} />}
                  title="Change Terminal"
                />
              </ActionPanel>
            }
            icon={Icon.Terminal}
            subtitle="Open your projects in a terminal"
            title="Terminal App"
          />
          <List.Item
            accessories={[
              {
                icon: gitAvailable ? Icon.Check : Icon.XMarkCircle,
                tag: {
                  color: gitAvailable ? Color.Green : Color.Red,
                  value: gitAvailable ? "Available" : "Not installed",
                },
              },
            ]}
            icon={Icon.Code}
            subtitle={
              gitAvailable === null
                ? "Checking..."
                : gitAvailable
                  ? "Branch and sync status shown per project"
                  : "Install Git to see branch and sync status"
            }
            title="Git Integration"
          />
        </List.Section>
      )}

      <List.Section title="Managed Workspaces">
        {workspaces.map((workspace, index) => {
          const workspaceApp = workspaceApps[workspace];
          return (
            <List.Item
              accessories={
                workspaceApp
                  ? [
                      {
                        tag: { color: Color.SecondaryText, value: workspaceApp.name },
                        tooltip: "Custom App Set",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Pencil}
                      target={
                        <SelectEditor
                          onReset={() => resetWorkspaceApp(workspace)}
                          onSelect={(app) => setWorkspaceApp(workspace, app)}
                        />
                      }
                      title="Set Workspace App"
                    />
                    {index > 0 && (
                      <Action
                        icon={Icon.ChevronUp}
                        onAction={() => moveWorkspace(index, "up")}
                        shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                        title="Move up"
                      />
                    )}
                    {index < workspaces.length - 1 && (
                      <Action
                        icon={Icon.ChevronDown}
                        onAction={() => moveWorkspace(index, "down")}
                        shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                        title="Move Down"
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {workspaceApp && (
                      <Action
                        icon={Icon.XMarkCircle}
                        onAction={() => resetWorkspaceApp(workspace)}
                        shortcut={{ key: "backspace", modifiers: ["cmd", "shift"] }}
                        title="Remove Workspace Application"
                      />
                    )}
                    <Action
                      icon={Icon.Trash}
                      onAction={() => removeWorkspace(workspace)}
                      style={Action.Style.Destructive}
                      title="Remove Workspace"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard content={path.basename(workspace)} title="Copy Workspace Name" />
                    <Action.CopyToClipboard
                      content={workspace}
                      shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
                      title="Copy Workspace Path"
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              icon={Icon.Folder}
              key={workspace}
              subtitle={workspace}
              title={path.basename(workspace)}
            />
          );
        })}
        <List.Item
          actions={
            <ActionPanel>
              <Action.Push
                onPop={() => {
                  loadSettings();

                  if (onWorkspacesChanged) {
                    onWorkspacesChanged();
                  }
                }}
                target={<AddWorkspaceForm />}
                title="Add Workspace"
              />
            </ActionPanel>
          }
          icon={Icon.Plus}
          title="Add Workspace"
        />
      </List.Section>
    </List>
  );
}
