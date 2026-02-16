import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import Settings from "./components/Settings";
import Walkthrough from "./components/Walkthrough";
import path from "path";

import { useWorkspace } from "./hooks/useWorkspace";
import { useI18n } from "./hooks/useI18n";
import { Project } from "./types";

export default function Command() {
  const {
    workspaces: parentWorkspaces,
    pinnedProjects,
    defaultApp,
    workspaceApps,
    projectGitStatus,
    isLoading,
    loadData,
    getSubdirectories,
    walkthroughCompleted,
    setWalkthroughCompleted,
    togglePinProject,
  } = useWorkspace();
  const { t } = useI18n();

  const [searchText, setSearchText] = useState("");

  const filteredWorkspaces = parentWorkspaces.map((workspace) => ({
    name: path.basename(workspace),
    path: workspace,
    projects: getSubdirectories(workspace).filter((project) =>
      project.name.toLowerCase().includes(searchText.toLowerCase()),
    ),
  }));

  const allProjects = filteredWorkspaces.flatMap((workspace) => workspace.projects);
  const pinnedList = allProjects.filter((project) => pinnedProjects.includes(project.fullPath));

  if (!isLoading && !walkthroughCompleted) {
    return (
      <Walkthrough
        onComplete={() => setWalkthroughCompleted(true)}
        workspaces={parentWorkspaces}
        defaultApp={defaultApp}
        loadData={loadData}
      />
    );
  }

  const ProjectItem = ({ project, workspacePath }: { project: Project; workspacePath: string }) => {
    const gitStatus = projectGitStatus[project.fullPath];
    const workspaceApp = workspaceApps[workspacePath];
    const appToUse = workspaceApp || defaultApp;
    const isPinned = pinnedProjects.includes(project.fullPath);

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
                    color: Color.Green,
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
                title={t("workspace.actions.openIn", { app: appToUse?.name || t("settings.general.defaultApp.label") })}
                target={project.fullPath}
                application={appToUse?.bundleId}
              />
              <Action
                title={isPinned ? t("workspace.actions.unpin") : t("workspace.actions.pin")}
                icon={isPinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => togglePinProject(project.fullPath)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.ShowInFinder title={t("workspace.actions.showInFinder")} path={project.fullPath} />
              <Action.OpenWith title={t("workspace.actions.openWith")} path={project.fullPath} />
            </ActionPanel.Section>
            <ActionPanel.Section title={t("workspace.sections.copy")}>
              <Action.CopyToClipboard title={t("workspace.actions.copyName")} content={project.name} />
              <Action.CopyToClipboard
                title={t("workspace.actions.copyPath")}
                content={project.fullPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title={t("settings.title")}
                icon={Icon.Gear}
                target={<Settings onWorkspacesChanged={loadData} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("workspace.search")}
      onSearchTextChange={setSearchText}
      throttle
    >
      {pinnedList.length > 0 && (
        <List.Section title={t("workspace.sections.pinned")}>
          {pinnedList.map((project) => (
            <ProjectItem key={`pinned-${project.fullPath}`} project={project} workspacePath={project.parentFolder} />
          ))}
        </List.Section>
      )}

      {filteredWorkspaces.map((workspace) => (
        <List.Section key={workspace.path} title={workspace.name} subtitle={workspace.path}>
          {workspace.projects.map((project) => (
            <ProjectItem key={project.fullPath} project={project} workspacePath={workspace.path} />
          ))}
        </List.Section>
      ))}

      {parentWorkspaces.length === 0 && !isLoading && (
        <List.EmptyView
          title={t("workspace.empty.title")}
          description={t("workspace.empty.description")}
          actions={
            <ActionPanel>
              <Action.Push title={t("workspace.empty.action")} target={<Settings onWorkspacesChanged={loadData} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
