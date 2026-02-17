import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useMemo } from "react";
import path from "path";
import { Project, App } from "../types";
import Settings from "./Settings";

interface ProjectItemProps {
  project: Project;
  workspacePath: string;
  isPinned: boolean;
  defaultApp: App | null;
  terminalApp: App | null;
  workspaceApps: Record<string, App>;
  onTogglePin: (fullPath: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function ProjectItem({
  project,
  workspacePath,
  isPinned,
  defaultApp,
  terminalApp,
  workspaceApps,
  onTogglePin,
  onRefresh,
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
      title={project.name}
      subtitle={isPinned ? path.dirname(project.fullPath) : ""}
      icon={Icon.Folder}
      accessories={[
        ...(gitStatus
          ? [
              {
                tag: {
                  value: `${gitStatus.pull ? `${gitStatus.pull}↓ ` : ""}${
                    gitStatus.push ? `${gitStatus.push}↑ ` : ""
                  }${gitStatus.branch}`,
                  color: gitColor,
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
              title={`Open in ${appToUse?.name || "Open in default app"}`}
              target={project.fullPath}
              application={appToUse?.bundleId}
            />
            <Action.Open
              title="Open in Terminal"
              icon={Icon.Terminal}
              target={project.fullPath}
              application={terminalApp?.bundleId}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action
              title={isPinned ? "Unpin Project" : "Pin Project"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => onTogglePin(project.fullPath)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder title="Show in Finder" path={project.fullPath} />
            <Action.OpenWith title="Open with…" path={project.fullPath} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Project Name" content={project.name} />
            <Action.CopyToClipboard
              title="Copy Project Path"
              content={project.fullPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Workspace Settings"
              icon={Icon.Gear}
              target={<Settings onWorkspacesChanged={onRefresh} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
