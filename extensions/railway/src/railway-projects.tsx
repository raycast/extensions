import { useState } from "react";
import { ActionPanel, List, Action, Icon, Color, Keyboard } from "@raycast/api";
import { ProjectGQL, WorkspaceGQL, fetchProjects, hasApiToken, projectUrl, railwayWebUrl } from "./railway";
import { getFavicon, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { MissingTokenView } from "./components/missing-token";
import { ServiceList } from "./components/service-list";
import { cliCommands } from "./cli";
import { starredProjectsStorageKey } from "./utils";

const allWorkspaces = "all";

export default function Command() {
  return hasApiToken() ? <ListProjects /> : <MissingTokenView />;
}

const ListProjects: React.FC = () => {
  const { isLoading, data: projects } = useCachedPromise(fetchProjects, [], {
    keepPreviousData: true,
    initialData: [],
  });
  const [workspaceId, setWorkspaceId] = useState(allWorkspaces);

  // Starred project IDs, kept in the order they were starred
  const {
    value: starredIds = [],
    setValue: setStarredIds,
    isLoading: isLoadingStarred,
  } = useLocalStorage<string[]>(starredProjectsStorageKey, []);

  const toggleStar = (projectId: string) =>
    setStarredIds(
      starredIds.includes(projectId) ? starredIds.filter((id) => id !== projectId) : [...starredIds, projectId],
    );

  const workspaces = uniqueWorkspaces(projects);
  const visible = workspaceId === allWorkspaces ? projects : projects.filter((p) => p.workspace?.id === workspaceId);
  const starred = starredIds.map((id) => visible.find((p) => p.id === id)).filter((p): p is ProjectGQL => Boolean(p));
  const others = visible.filter((p) => !starredIds.includes(p.id));

  // With more than one workspace, group projects by workspace like the CLI's `railway list`
  const sections =
    workspaceId === allWorkspaces && workspaces.length > 1
      ? workspaces.map((w) => ({ key: w.id, title: w.name, projects: others.filter((p) => p.workspace?.id === w.id) }))
      : [{ key: "projects", title: starred.length ? "Projects" : undefined, projects: others }];

  return (
    <List
      isLoading={isLoading || isLoadingStarred}
      searchBarPlaceholder="Search project"
      searchBarAccessory={
        workspaces.length > 1 ? (
          <List.Dropdown tooltip="Select Workspace" storeValue onChange={setWorkspaceId}>
            <List.Dropdown.Item title="All Workspaces" value={allWorkspaces} icon={Icon.AppWindowGrid3x3} />
            <List.Dropdown.Section>
              {workspaces.map((w) => (
                <List.Dropdown.Item key={w.id} title={w.name} value={w.id} icon={Icon.TwoPeople} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {!isLoading && !projects.length && (
        <List.EmptyView
          title="Create a New Project"
          description="No projects found"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={getFavicon(`${railwayWebUrl}/new`)}
                title="Create New Project"
                url={`${railwayWebUrl}/new`}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Starred">
        {starred.map((p) => (
          <ProjectItem key={p.id} project={p} isStarred onToggleStar={() => toggleStar(p.id)} />
        ))}
      </List.Section>
      {sections.map((section) => (
        <List.Section key={section.key} title={section.title}>
          {section.projects.map((p) => (
            <ProjectItem key={p.id} project={p} isStarred={false} onToggleStar={() => toggleStar(p.id)} />
          ))}
        </List.Section>
      ))}
    </List>
  );
};

function uniqueWorkspaces(projects: ProjectGQL[]): WorkspaceGQL[] {
  const workspaces = new Map<string, WorkspaceGQL>();
  for (const p of projects) {
    if (p.workspace && !workspaces.has(p.workspace.id)) workspaces.set(p.workspace.id, p.workspace);
  }
  return [...workspaces.values()];
}

interface ProjectItemProps {
  project: ProjectGQL;
  isStarred: boolean;
  onToggleStar: () => void;
}

function ProjectItem({ project: p, isStarred, onToggleStar }: ProjectItemProps) {
  return (
    <List.Item
      icon={p.isPublic ? Icon.Eye : Icon.EyeDisabled}
      title={p.name}
      subtitle={p.description ?? undefined}
      accessories={[
        ...(isStarred ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Starred" }] : []),
        { date: new Date(p.updatedAt) },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Services"
              icon={Icon.AppWindowList}
              target={<ServiceList project={{ id: p.id, name: p.name }} />}
            />
            <Action.OpenInBrowser title="Project Architecture" url={projectUrl(p.id)} />
            <Action.OpenInBrowser
              title="Project Settings"
              url={projectUrl(p.id, "settings")}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action.OpenInBrowser
              title="Project Observability"
              url={projectUrl(p.id, "observability")}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.OpenInBrowser
              title="Project Logs"
              url={projectUrl(p.id, "logs")}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={isStarred ? "Unstar Project" : "Star Project"}
              icon={isStarred ? Icon.StarDisabled : Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={onToggleStar}
            />
            <Action.CopyToClipboard
              title="Copy Project URL"
              content={projectUrl(p.id)}
              shortcut={{ modifiers: ["opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy CLI Link Command"
              icon={Icon.Terminal}
              content={cliCommands.linkProject(p.id)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
