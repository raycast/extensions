import { ActionPanel, Action, List } from "@raycast/api";
import { useState, useMemo } from "react";
import Settings from "./components/Settings";
import Walkthrough from "./components/Walkthrough";
import ProjectItem from "./components/ProjectItem";
import path from "path";

import { useWorkspace } from "./hooks/useWorkspace";
import { Project } from "./types";

export default function Command() {
  const {
    workspaces: parentWorkspaces,
    projects,
    pinnedProjects,
    defaultApp,
    terminalApp,
    workspaceApps,
    isLoading,
    loadData,
    walkthroughCompleted,
    setWalkthroughCompleted,
    togglePinProject,
  } = useWorkspace();

  const [searchText, setSearchText] = useState("");

  const filteredProjects = useMemo(() => {
    if (!projects) {
      return [];
    }
    return projects.filter((project) => {
      const searchLower = searchText.toLowerCase();
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.fullPath.toLowerCase().includes(searchLower) ||
        project.gitStatus?.branch?.toLowerCase().includes(searchLower)
      );
    });
  }, [projects, searchText]);

  const projectsByWorkspace = useMemo(() => {
    const map: Record<string, Project[]> = {};
    parentWorkspaces.forEach((ws: string) => {
      map[ws] = filteredProjects.filter((p: Project) => p.parentFolder === ws);
    });
    return map;
  }, [parentWorkspaces, filteredProjects]);

  const pinnedList = useMemo(() => {
    return (projects || []).filter((project: Project) => pinnedProjects.includes(project.fullPath));
  }, [projects, pinnedProjects]);

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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for projects..."
      onSearchTextChange={setSearchText}
      onSelectionChange={() => {}}
      throttle
    >
      {pinnedList.length > 0 && (
        <List.Section title="Pinned">
          {pinnedList.map((project) => (
            <ProjectItem
              key={`pinned-${project.fullPath}`}
              project={project}
              workspacePath={project.parentFolder}
              isPinned={true}
              defaultApp={defaultApp}
              terminalApp={terminalApp}
              workspaceApps={workspaceApps}
              onTogglePin={togglePinProject}
              onRefresh={loadData}
            />
          ))}
        </List.Section>
      )}

      {parentWorkspaces.map((workspace) => {
        const workspaceProjects = projectsByWorkspace[workspace] || [];
        if (workspaceProjects.length === 0 && searchText) {
          return null;
        }

        return (
          <List.Section key={workspace} title={path.basename(workspace)} subtitle={workspace}>
            {workspaceProjects.map((project: Project) => (
              <ProjectItem
                key={project.fullPath}
                project={project}
                workspacePath={workspace}
                isPinned={pinnedProjects.includes(project.fullPath)}
                defaultApp={defaultApp}
                terminalApp={terminalApp}
                workspaceApps={workspaceApps}
                onTogglePin={togglePinProject}
                onRefresh={loadData}
              />
            ))}
          </List.Section>
        );
      })}

      {parentWorkspaces.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Workspaces"
          description="Add a workspace in settings to see your projects."
          actions={
            <ActionPanel>
              <Action.Push title="Open Settings" target={<Settings onWorkspacesChanged={loadData} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
