import { getPreferenceValues, Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { ASTaskItem } from "./components/ASTaskItem";
import { Project, Task } from "./types/ticktick";
import { isInboxProjectId } from "./api/inbox";
import { useState, useEffect, useCallback } from "react";
import { getProjects, getTasksByProjectId, ASSection } from "./lib/applescript";
import { useFirstRun } from "./lib/useFirstRun";

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();

// --- API mode ---

function ProjectTasks({
  project,
  tasks,
  projects,
  isLoading,
  onMutate,
}: {
  project: Project;
  tasks: Task[];
  projects: Project[];
  isLoading: boolean;
  onMutate: () => void;
}) {
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  return (
    <List isLoading={isLoading} navigationTitle={project.name} searchBarPlaceholder={`Search in ${project.name}...`}>
      {projectTasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Checkmark} title="No tasks" description={`${project.name} is empty.`} />
      ) : (
        <List.Section title={`${project.name} · ${projectTasks.length} task${projectTasks.length !== 1 ? "s" : ""}`}>
          {projectTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={projects}
              onComplete={onMutate}
              onDelete={onMutate}
              onRevalidate={onMutate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ProjectsAPI() {
  useFirstRun();
  useAlerts();
  const { data, isLoading, revalidate } = useSync();

  const projects = data.projects.filter(
    (p) => !p.closed && p.id !== data.inboxId && (p.kind ?? "").toUpperCase() !== "INBOX" && !isInboxProjectId(p.id)
  );

  const taskCountMap = new Map<string, number>();
  for (const task of data.tasks) {
    taskCountMap.set(task.projectId, (taskCountMap.get(task.projectId) ?? 0) + 1);
  }

  const folders = new Map<string, Project[]>();
  const topLevel: Project[] = [];
  for (const project of projects) {
    if (project.groupId) {
      if (!folders.has(project.groupId)) folders.set(project.groupId, []);
      folders.get(project.groupId)!.push(project);
    } else {
      topLevel.push(project);
    }
  }

  const renderProjectItem = (project: Project) => {
    const count = taskCountMap.get(project.id) ?? 0;
    return (
      <List.Item
        key={project.id}
        icon={{ source: Icon.List, tintColor: (project.color as Color) ?? Color.Blue }}
        title={project.name}
        accessories={count > 0 ? [{ text: String(count), icon: Icon.CheckList }] : [{ text: "Empty" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Project"
              icon={Icon.ArrowRight}
              target={
                <ProjectTasks
                  project={project}
                  tasks={data.tasks}
                  projects={data.projects}
                  isLoading={isLoading}
                  onMutate={revalidate}
                />
              }
            />
          </ActionPanel>
        }
      />
    );
  };

  const allSections: React.JSX.Element[] = [];
  if (topLevel.length > 0) {
    allSections.push(
      <List.Section key="top" title="Projects">
        {topLevel.map(renderProjectItem)}
      </List.Section>
    );
  }
  const folderNameMap = new Map(data.projectGroups.map((g) => [g.id, g.name]));
  for (const [groupId, groupProjects] of folders.entries()) {
    const folderName =
      folderNameMap.get(groupId) ?? `Folder · ${groupProjects.length} list${groupProjects.length !== 1 ? "s" : ""}`;
    allSections.push(
      <List.Section key={groupId} title={folderName}>
        {groupProjects.map(renderProjectItem)}
      </List.Section>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Projects" searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.List} title="No projects" description="Create a project in TickTick." />
      ) : (
        allSections
      )}
    </List>
  );
}

// --- AppleScript mode ---

function ASProjectTasks({ project }: { project: { id: string; name: string } }) {
  const [sections, setSections] = useState<ASSection[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setIsLoading(true);
    getTasksByProjectId(project.id).then((s) => {
      setSections(s);
      setIsLoading(false);
    });
  }, [project.id, refreshKey]);

  const allTasks = sections?.flatMap((s) => s.children) ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={project.name} searchBarPlaceholder={`Search in ${project.name}...`}>
      {!isLoading && allTasks.length === 0 ? (
        <List.EmptyView icon={Icon.Checkmark} title="No tasks" description={`${project.name} is empty.`} />
      ) : (
        sections?.map((section) => (
          <List.Section key={section.id} title={section.name} subtitle={`${section.children.length}`}>
            {section.children.map((task) => (
              <ASTaskItem key={task.id} task={task} onRefresh={refresh} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function ProjectsAppleScript() {
  useFirstRun();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProjects().then((ps) => {
      setProjects(ps.filter((p) => p.name !== "Inbox"));
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Projects" searchBarPlaceholder="Search projects...">
      {!isLoading && projects.length === 0 ? (
        <List.EmptyView icon={Icon.List} title="No projects" description="Create a project in TickTick." />
      ) : (
        <List.Section title="Projects">
          {projects.map((project) => (
            <List.Item
              key={project.id}
              icon={{ source: Icon.List, tintColor: Color.Blue }}
              title={project.name}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Project"
                    icon={Icon.ArrowRight}
                    target={<ASProjectTasks project={project} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default integrationMode === "applescript" ? ProjectsAppleScript : withAccessToken({ authorize })(ProjectsAPI);
