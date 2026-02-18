import { Action, ActionPanel, List } from "@raycast/api";
import path from "path";
import { useMemo, useState } from "react";

import Onboarding from "@/components/Onboarding";
import ProjectItem from "@/components/ProjectItem";
import Settings from "@/components/Settings";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Project } from "@/types";

export default function Command() {
  const {
    defaultApp,
    isLoading,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    projects,
    setOnboardingCompleted,
    terminalApp,
    togglePinProject,
    workspaceApps,
    workspaces: parentWorkspaces,
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

  const pinnedSet = useMemo(() => new Set(pinnedProjects), [pinnedProjects]);

  const projectsByWorkspace = useMemo(() => {
    const map: Record<string, Project[]> = {};

    parentWorkspaces.forEach((ws: string) => {
      map[ws] = filteredProjects.filter(
        (p: Project) => p.parentFolder === ws && (searchText || !pinnedSet.has(p.fullPath)),
      );
    });

    return map;
  }, [parentWorkspaces, filteredProjects, pinnedSet, searchText]);

  const pinnedList = useMemo(() => {
    return (projects || []).filter((project: Project) => pinnedSet.has(project.fullPath));
  }, [projects, pinnedSet]);

  if (!isLoading && !onboardingCompleted) {
    return (
      <Onboarding
        defaultApp={defaultApp}
        loadData={loadData}
        onComplete={() => setOnboardingCompleted(true)}
        workspaces={parentWorkspaces}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for projects..."
      throttle
    >
      {pinnedList.length > 0 && !searchText && (
        <List.Section title="Pinned">
          {pinnedList.map((project) => (
            <ProjectItem
              defaultApp={defaultApp}
              isPinned={true}
              key={`pinned-${project.fullPath}`}
              onRefresh={loadData}
              onTogglePin={togglePinProject}
              project={project}
              terminalApp={terminalApp}
              workspaceApps={workspaceApps}
              workspacePath={project.parentFolder}
            />
          ))}
        </List.Section>
      )}

      {parentWorkspaces.map((workspace) => {
        const workspaceProjects = projectsByWorkspace[workspace] || [];

        if (workspaceProjects.length === 0) {
          return null;
        }

        return (
          <List.Section key={workspace} subtitle={workspace} title={path.basename(workspace)}>
            {workspaceProjects.map((project: Project) => (
              <ProjectItem
                defaultApp={defaultApp}
                isPinned={pinnedSet.has(project.fullPath)}
                key={project.fullPath}
                onRefresh={loadData}
                onTogglePin={togglePinProject}
                project={project}
                terminalApp={terminalApp}
                workspaceApps={workspaceApps}
                workspacePath={workspace}
              />
            ))}
          </List.Section>
        );
      })}

      {parentWorkspaces.length === 0 && !isLoading && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push target={<Settings onWorkspacesChanged={loadData} />} title="Open Settings" />
            </ActionPanel>
          }
          description="Add a workspace in settings to see your projects."
          title="No Workspaces"
        />
      )}
    </List>
  );
}
