import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import {
  DbSession,
  OpenSession,
  Project,
  useOpenSessions,
  useProjectSessions,
  useProjects,
  useSessionCounts,
} from "./lib/hooks";
import { openOpenCode, resumeSession } from "./lib/terminal";
import { formatTime, getLiveness, livenessTag } from "./search-sessions";

function projectName(project: Project): string {
  if (project.name) return project.name;
  const parts = project.worktree.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || project.worktree;
}

function dirBasename(directory: string): string {
  return directory.replace(/\/$/, "").split("/").pop() || directory;
}

function groupByDirectory(sessions: DbSession[]): Array<{ folder: string; sessions: DbSession[] }> {
  const groups = new Map<string, DbSession[]>();
  for (const s of sessions) {
    const folder = dirBasename(s.directory);
    const list = groups.get(folder) ?? [];
    list.push(s);
    groups.set(folder, list);
  }
  // Sort groups by most recent session in each, descending
  return Array.from(groups.entries())
    .map(([folder, items]) => ({ folder, sessions: items }))
    .sort(
      (a, b) => Math.max(...b.sessions.map((s) => s.timeUpdated)) - Math.max(...a.sessions.map((s) => s.timeUpdated)),
    );
}

function ProjectSessions({ project }: { project: Project }) {
  const [folder, setFolder] = useState<string>("all");
  const { data: projectSessions = [], isLoading } = useProjectSessions(project.id);
  const { data: rawOpen } = useOpenSessions();
  const openSessions: OpenSession[] = Array.isArray(rawOpen) ? rawOpen : [];

  const groups = groupByDirectory(projectSessions);
  const filtered = folder === "all" ? groups : groups.filter((g) => g.folder === folder);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Sessions — ${projectName(project)}`}
      searchBarPlaceholder="Search sessions..."
      searchBarAccessory={
        groups.length > 1 ? (
          <List.Dropdown tooltip="Filter by folder" onChange={setFolder} value={folder}>
            <List.Dropdown.Item title="All Folders" value="all" icon={Icon.Folder} />
            <List.Dropdown.Section title="Folders">
              {groups.map((g) => (
                <List.Dropdown.Item key={g.folder} title={`${g.folder} (${g.sessions.length})`} value={g.folder} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {projectSessions.length === 0 ? (
        <List.EmptyView title="No Sessions" description="No sessions found for this project." icon={Icon.Message} />
      ) : (
        filtered.map((group) => (
          <List.Section key={group.folder} title={group.folder} subtitle={`${group.sessions.length}`}>
            {group.sessions.map((session) => {
              const liveness = getLiveness(openSessions, session.id);
              const accessories: List.Item.Accessory[] = [];
              const tag = livenessTag(liveness);
              if (tag) accessories.push(tag);
              accessories.push({ text: formatTime(session.timeUpdated) });

              return (
                <List.Item
                  key={session.id}
                  title={session.title}
                  icon={Icon.Message}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Resume in Terminal"
                        icon={Icon.Terminal}
                        onAction={() => resumeSession(session.directory, session.id, liveness !== undefined)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Session ID"
                        content={session.id}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}

export default function SearchProjects() {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: sessionCounts = {} } = useSessionCounts();

  const notInstalled = projectsError?.message?.includes("not installed");

  return (
    <List isLoading={projectsLoading} searchBarPlaceholder="Search projects...">
      {notInstalled ? (
        <List.EmptyView
          title="OpenCode Not Installed"
          description="Install it with: brew install anomalyco/tap/opencode"
          icon={Icon.Warning}
        />
      ) : projects.length === 0 && !projectsLoading ? (
        <List.EmptyView
          title="No Projects Found"
          description="Start OpenCode in a terminal to see projects here."
          icon={Icon.Folder}
        />
      ) : (
        projects.map((project) => {
          const count = sessionCounts[project.id] ?? 0;
          const accessories: List.Item.Accessory[] = [];
          if (count > 0) {
            accessories.push({
              tag: { value: `${count} sessions`, color: Color.SecondaryText },
            });
          }

          return (
            <List.Item
              key={project.id}
              title={projectName(project)}
              subtitle={project.worktree}
              icon={Icon.Folder}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Sessions"
                    icon={Icon.Message}
                    target={<ProjectSessions project={project} />}
                  />
                  <Action
                    title="Open in Terminal"
                    icon={Icon.Terminal}
                    onAction={() => openOpenCode(project.worktree)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={project.worktree}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
