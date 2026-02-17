import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import path from "path";
import { useMemo } from "react";

import Settings from "@/components/Settings";
import { App, Project } from "@/types";

interface ProjectItemProps {
  defaultApp: App | null;
  isPinned: boolean;
  onRefresh: () => Promise<void>;
  onTogglePin: (fullPath: string) => Promise<void>;
  project: Project;
  terminalApp: App | null;
  workspaceApps: Record<string, App>;
  workspacePath: string;
}

export default function ProjectItem({
  defaultApp,
  isPinned,
  onRefresh,
  onTogglePin,
  project,
  terminalApp,
  workspaceApps,
  workspacePath,
}: ProjectItemProps) {
  const gitStatus = project.gitStatus;
  const workspaceApp = workspaceApps[workspacePath];
  const appToUse = workspaceApp || defaultApp;

  const gitColor = useMemo(() => {
    if (!gitStatus) {
      return undefined;
    }

    if (gitStatus.pull || gitStatus.push) {
      return Color.Orange;
    }

    return Color.Green;
  }, [gitStatus]);

  return (
    <List.Item
      accessories={[
        ...(gitStatus
          ? [
              {
                tag: {
                  color: gitColor,
                  value: `${gitStatus.pull ? `${gitStatus.pull}↓ ` : ""}${
                    gitStatus.push ? `${gitStatus.push}↑ ` : ""
                  }${gitStatus.branch}`,
                },
                tooltip: `Branch: ${gitStatus.branch}\nPull: ${gitStatus.pull || 0}\nPush: ${gitStatus.push || 0}`,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              application={appToUse?.bundleId}
              icon={Icon.AppWindow}
              target={project.fullPath}
              title={`Open in ${appToUse?.name || "Open in default app"}`}
            />
            <Action.Open
              application={terminalApp?.bundleId}
              icon={Icon.Terminal}
              shortcut={{ key: "t", modifiers: ["cmd", "shift"] }}
              target={project.fullPath}
              title="Open in Terminal"
            />
            <Action
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              onAction={() => onTogglePin(project.fullPath)}
              shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
              title={isPinned ? "Unpin Project" : "Pin Project"}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder path={project.fullPath} title="Show in Finder" />
            <Action.OpenWith path={project.fullPath} title="Open with…" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard content={project.name} title="Copy Project Name" />
            <Action.CopyToClipboard
              content={project.fullPath}
              shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
              title="Copy Project Path"
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Gear}
              shortcut={{ key: ",", modifiers: ["cmd", "shift"] }}
              target={<Settings onWorkspacesChanged={onRefresh} />}
              title="Workspace Settings"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={Icon.Folder}
      subtitle={isPinned ? path.dirname(project.fullPath) : ""}
      title={project.name}
    />
  );
}
