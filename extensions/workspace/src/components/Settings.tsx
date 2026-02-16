import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import path from "path";
import AddWorkspaceForm from "./AddWorkspaceForm";
import SelectEditor from "./SelectEditor";
import LanguageSettings from "./LanguageSettings";
import { useI18n } from "../hooks/useI18n";
import { getLanguageName } from "../utils/i18n";

import { type Application } from "@raycast/api";

import {
  getStoredWorkspaces,
  saveStoredWorkspaces,
  getStoredApp,
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
  const [workspaceApps, setWorkspaceApps] = useState<Record<string, App>>({});
  const { t, language } = useI18n();

  const loadSettings = useCallback(async () => {
    const [storedWorkspaces, storedDefaultApp, storedWorkspaceApps] = await Promise.all([
      getStoredWorkspaces(),
      getStoredApp(),
      getWorkspaceApps(),
    ]);
    setWorkspaces(storedWorkspaces);
    setDefaultApp(storedDefaultApp);
    setWorkspaceApps(storedWorkspaceApps);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function removeWorkspace(workspacePath: string) {
    if (
      await confirmAlert({
        title: t("settings.workspaces.removeWorkspace"),
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
      await showToast({ style: Toast.Style.Success, title: t("settings.toasts.workspaceRemoved") });
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
      title: t("settings.toasts.appUpdated"),
      message: `${path.basename(workspacePath)} -> ${app.name}`,
    });
  }

  async function resetWorkspaceApp(workspacePath: string) {
    const newWorkspaceApps = { ...workspaceApps };
    delete newWorkspaceApps[workspacePath];
    await saveWorkspaceApps(newWorkspaceApps);
    setWorkspaceApps(newWorkspaceApps);
    await showToast({ style: Toast.Style.Success, title: t("settings.toasts.appReset") });
  }

  async function moveWorkspace(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workspaces.length) return;

    const newWorkspaces = [...workspaces];
    const [moved] = newWorkspaces.splice(index, 1);
    newWorkspaces.splice(newIndex, 0, moved);

    await saveStoredWorkspaces(newWorkspaces);
    setWorkspaces(newWorkspaces);
    if (onWorkspacesChanged) {
      await onWorkspacesChanged();
    }
    await showToast({ style: Toast.Style.Success, title: t("settings.toasts.workspaceMoved") });
  }

  return (
    <List navigationTitle={showGeneral ? t("settings.title") : t("settings.workspaces.title")}>
      {showGeneral && (
        <List.Section title={t("settings.general.title")}>
          <List.Item
            title={t("settings.general.defaultApp.title")}
            subtitle={defaultApp?.name || t("selectEditor.default.subtitle")}
            icon={Icon.AppWindow}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("selectEditor.default.action")}
                  icon={Icon.Pencil}
                  target={<SelectEditor />}
                  onPop={loadSettings}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title={t("settings.general.language.title")}
            subtitle={getLanguageName(language)}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("settings.general.language.title")}
                  icon={Icon.Pencil}
                  target={<LanguageSettings />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title={t("settings.workspaces.title")}>
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
                        tag: { value: workspaceApp.name, color: Icon.AppWindow },
                        icon: Icon.AppWindow,
                        tooltip: t("settings.workspaces.appSet"),
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title={t("settings.workspaces.setWorkspaceApp")}
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
                        title={t("settings.workspaces.moveUp")}
                        icon={Icon.ChevronUp}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                        onAction={() => moveWorkspace(index, "up")}
                      />
                    )}
                    {index < workspaces.length - 1 && (
                      <Action
                        title={t("settings.workspaces.moveDown")}
                        icon={Icon.ChevronDown}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                        onAction={() => moveWorkspace(index, "down")}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {workspaceApp && (
                      <Action
                        title={t("settings.workspaces.removeApp")}
                        icon={Icon.XMarkCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={() => resetWorkspaceApp(workspace)}
                      />
                    )}
                    <Action
                      title={t("settings.workspaces.removeWorkspace")}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeWorkspace(workspace)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={t("workspace.sections.copy")}>
                    <Action.CopyToClipboard
                      title={t("settings.workspaces.copyName")}
                      content={path.basename(workspace)}
                    />
                    <Action.CopyToClipboard
                      title={t("settings.workspaces.copyPath")}
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
          title={t("settings.workspaces.addWorkspace")}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title={t("settings.workspaces.addWorkspace")}
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
