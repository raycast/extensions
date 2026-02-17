import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Alert, Color } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import path from "path";
import AddWorkspaceForm from "./AddWorkspaceForm";
import SelectEditor from "./SelectEditor";
import TerminalSettings from "./TerminalSettings";

import { type Application } from "@raycast/api";

import {
  getStoredWorkspaces,
  saveStoredWorkspaces,
  getStoredApp,
  getStoredTerminalApp,
  getWorkspaceApps,
  saveWorkspaceApps,
} from "../utils/storage";
import { App } from "../types";

interface SettingsProps {
  onWorkspacesChanged?: () => Promise<void>;
  showGeneral?: boolean;
}

export default function Settings({ onWorkspacesChanged, showGeneral = true }: SettingsProps) {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [defaultApp, setDefaultApp] = useState<App | null>(null);
  const [terminalApp, setTerminalApp] = useState<App | null>(null);
  const [workspaceApps, setWorkspaceApps] = useState<Record<string, App>>({});

  const loadSettings = useCallback(async () => {
    const [storedWorkspaces, storedDefaultApp, storedWorkspaceApps, storedTerminalApp] = await Promise.all([
      getStoredWorkspaces(),
      getStoredApp(),
      getWorkspaceApps(),
      getStoredTerminalApp(),
    ]);
    setWorkspaces(storedWorkspaces);
    setDefaultApp(storedDefaultApp);
    setWorkspaceApps(storedWorkspaceApps);
    setTerminalApp(storedTerminalApp);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function removeWorkspace(workspacePath: string) {
    if (
      await confirmAlert({
        title: "Remove Workspace",
        message: `Remove "${path.basename(workspacePath)}" from your workspace projects?`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const newWorkspaces = workspaces.filter((workspacePathItem) => workspacePathItem !== workspacePath);
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
    }
  }

  async function setWorkspaceApp(workspacePath: string, app: Application) {
    const newWorkspaceApps = {
      ...workspaceApps,
      [workspacePath]: { name: app.name, bundleId: app.bundleId || "" },
    };
    await saveWorkspaceApps(newWorkspaceApps);
    setWorkspaceApps(newWorkspaceApps);
    await showToast({
      style: Toast.Style.Success,
      title: "App Updated",
      message: `${path.basename(workspacePath)} -> ${app.name}`,
    });
  }

  async function resetWorkspaceApp(workspacePath: string) {
    const newWorkspaceApps = { ...workspaceApps };
    delete newWorkspaceApps[workspacePath];
    await saveWorkspaceApps(newWorkspaceApps);
    setWorkspaceApps(newWorkspaceApps);
    await showToast({ style: Toast.Style.Success, title: "Application Reset" });
  }

  async function moveWorkspace(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workspaces.length) {
      return;
    }

    const newWorkspaces = [...workspaces];
    const [moved] = newWorkspaces.splice(index, 1);
    newWorkspaces.splice(newIndex, 0, moved);

    await saveStoredWorkspaces(newWorkspaces);
    setWorkspaces(newWorkspaces);
    if (onWorkspacesChanged) {
      await onWorkspacesChanged();
    }
    await showToast({ style: Toast.Style.Success, title: "Workspace Moved" });
  }

  return (
    <List navigationTitle={showGeneral ? "Workspace Settings" : "Managed Workspaces"}>
      {showGeneral && (
        <List.Section title="General">
          <List.Item
            title="Default App"
            subtitle={defaultApp?.name || "Not selected"}
            icon={Icon.AppWindow}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Change Application"
                  icon={Icon.Pencil}
                  target={<SelectEditor />}
                  onPop={loadSettings}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Terminal App"
            subtitle={terminalApp?.name || "System default"}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Change Terminal"
                  icon={Icon.Pencil}
                  target={<TerminalSettings />}
                  onPop={loadSettings}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Managed Workspaces">
        {workspaces.map((workspace, index) => {
          const workspaceApp = workspaceApps[workspace];
          return (
            <List.Item
              key={workspace}
              title={path.basename(workspace)}
              subtitle={workspace}
              icon={Icon.Folder}
              accessories={
                workspaceApp
                  ? [
                      {
                        tag: { value: workspaceApp.name, color: Color.Blue },
                        icon: Icon.AppWindow,
                        tooltip: "Custom App Set",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Set Workspace App"
                      icon={Icon.Pencil}
                      target={
                        <SelectEditor
                          onSelect={(app) => setWorkspaceApp(workspace, app)}
                          onReset={() => resetWorkspaceApp(workspace)}
                        />
                      }
                    />
                    {index > 0 && (
                      <Action
                        title="Move up"
                        icon={Icon.ChevronUp}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                        onAction={() => moveWorkspace(index, "up")}
                      />
                    )}
                    {index < workspaces.length - 1 && (
                      <Action
                        title="Move Down"
                        icon={Icon.ChevronDown}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                        onAction={() => moveWorkspace(index, "down")}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {workspaceApp && (
                      <Action
                        title="Remove Workspace Application"
                        icon={Icon.XMarkCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={() => resetWorkspaceApp(workspace)}
                      />
                    )}
                    <Action
                      title="Remove Workspace"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeWorkspace(workspace)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard title="Copy Workspace Name" content={path.basename(workspace)} />
                    <Action.CopyToClipboard
                      title="Copy Workspace Path"
                      content={workspace}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          title="Add Workspace"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Workspace"
                target={<AddWorkspaceForm />}
                onPop={() => {
                  loadSettings();
                  if (onWorkspacesChanged) {
                    onWorkspacesChanged();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
