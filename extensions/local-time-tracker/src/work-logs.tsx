import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { formatLogDate, formatTime, isSameLocalDay } from "./lib/date";
import { getCategoryIcon, getCategoryName } from "./lib/categories";
import { formatDuration, getDurationSeconds } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { findProject, getProjectName, sortProjectsByPreference } from "./lib/projects";
import { deleteWorkLog, getProjectCategories, getProjects, getWorkLogs, upsertWorkLog } from "./lib/storage";
import type { Project, ProjectCategory, WorkLog } from "./lib/types";

export default function WorkLogsCommand() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    try {
      const [savedLogs, savedProjects, savedCategories] = await Promise.all([
        getWorkLogs(),
        getProjects(),
        getProjectCategories(),
      ]);
      setWorkLogs(savedLogs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
      setProjects(savedProjects);
      setCategories(savedCategories);
    } catch (error) {
      await showFailure("Failed to load work logs", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const groups = useMemo(() => groupLogsByDay(workLogs), [workLogs]);
  const addAction = (
    <Action.Push
      title="Add Work Log"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<WorkLogForm projects={projects} categories={categories} onSaved={async () => reload()} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects and descriptions">
      {workLogs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Work Logs"
          description="Stop a timer or add a work log manually."
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      ) : null}

      {groups.map((group) => (
        <List.Section key={group.key} title={group.title}>
          {group.logs.map((workLog) => {
            const projectName = getProjectName(projects, workLog.projectId);
            return (
              <List.Item
                key={workLog.id}
                icon={getCategoryIcon(findProject(projects, workLog.projectId)?.type ?? "")}
                title={projectName}
                subtitle={workLog.description || "No description"}
                keywords={[projectName, workLog.description].filter(Boolean)}
                accessories={[
                  { text: formatDuration(getDurationSeconds(workLog.startedAt, workLog.endedAt)) },
                  { text: `${formatTime(workLog.startedAt)} – ${formatTime(workLog.endedAt)}` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      icon={Icon.Eye}
                      target={
                        <WorkLogDetail
                          workLog={workLog}
                          projects={projects}
                          categories={categories}
                          onChanged={reload}
                        />
                      }
                    />
                    {addAction}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function WorkLogDetail({
  workLog,
  projects,
  categories,
  onChanged,
}: {
  workLog: WorkLog;
  projects: Project[];
  categories: ProjectCategory[];
  onChanged: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [currentWorkLog, setCurrentWorkLog] = useState(workLog);

  useEffect(() => {
    setCurrentWorkLog(workLog);
  }, [workLog]);

  const project = findProject(projects, currentWorkLog.projectId);
  const duration = formatDuration(getDurationSeconds(currentWorkLog.startedAt, currentWorkLog.endedAt));

  async function remove() {
    const confirmed = await confirmAlert({
      title: "Delete Work Log?",
      message: currentWorkLog.description
        ? `${project?.name ?? "Unknown Project"}: ${currentWorkLog.description}`
        : (project?.name ?? "Unknown Project"),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deleteWorkLog(currentWorkLog.id);
      await showToast({ style: Toast.Style.Success, title: "Work log deleted" });
      await onChanged();
      pop();
    } catch (error) {
      await showFailure("Failed to delete work log", error);
    }
  }

  return (
    <Detail
      markdown={`# ${escapeMarkdown(project?.name ?? "Unknown Project")}\n\n${currentWorkLog.description ? escapeMarkdown(currentWorkLog.description) : "_No description_"}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Category"
            text={project ? getCategoryName(categories, project.type) : "Unknown"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Started" text={new Date(currentWorkLog.startedAt).toLocaleString()} />
          <Detail.Metadata.Label title="Ended" text={new Date(currentWorkLog.endedAt).toLocaleString()} />
          <Detail.Metadata.Label title="Duration" text={duration} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Work Log"
            icon={Icon.Pencil}
            target={
              <WorkLogForm
                projects={projects}
                categories={categories}
                workLog={currentWorkLog}
                onSaved={async (savedLog) => {
                  setCurrentWorkLog(savedLog);
                  await onChanged();
                }}
              />
            }
          />
          <Action title="Delete Work Log" icon={Icon.Trash} style={Action.Style.Destructive} onAction={remove} />
        </ActionPanel>
      }
    />
  );
}

type WorkLogFormValues = {
  projectId: string;
  description: string;
  startedAt: Date;
  endedAt: Date;
};

function WorkLogForm({
  projects,
  categories,
  workLog,
  onSaved,
}: {
  projects: Project[];
  categories: ProjectCategory[];
  workLog?: WorkLog;
  onSaved: (savedLog: WorkLog) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const now = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => new Date(now.getTime() - 60 * 60 * 1000), [now]);
  const selectableProjects = useMemo(
    () => sortProjectsByPreference(projects.filter((project) => project.isActive || project.id === workLog?.projectId)),
    [projects, workLog?.projectId],
  );

  async function submit(values: WorkLogFormValues) {
    if (isSubmitting) return;

    const description = values.description.trim();
    const project = findProject(projects, values.projectId);
    if (!project || (!workLog && !project.isActive)) {
      await showToast({ style: Toast.Style.Failure, title: "Select an available project" });
      return;
    }
    const startedAtMs = values.startedAt.getTime();
    const endedAtMs = values.endedAt.getTime();
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs) || endedAtMs <= startedAtMs) {
      await showToast({ style: Toast.Style.Failure, title: "End time must be after start time" });
      return;
    }
    if (endedAtMs > Date.now() + 5 * 60 * 1000) {
      await showToast({ style: Toast.Style.Failure, title: "End time cannot be in the future" });
      return;
    }
    if (endedAtMs - startedAtMs > 24 * 60 * 60 * 1000) {
      const confirmed = await confirmAlert({
        title: "Save a log longer than 24 hours?",
        message: "Check the start and end times before continuing.",
        primaryAction: { title: "Save Anyway" },
      });
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      const savedAt = new Date().toISOString();
      const nextLog: WorkLog = {
        id: workLog?.id ?? crypto.randomUUID(),
        projectId: project.id,
        description,
        startedAt: values.startedAt.toISOString(),
        endedAt: values.endedAt.toISOString(),
        createdAt: workLog?.createdAt ?? savedAt,
        updatedAt: savedAt,
      };
      await upsertWorkLog(nextLog);
      await showToast({ style: Toast.Style.Success, title: workLog ? "Work log updated" : "Work log added" });
      await onSaved(nextLog);
      pop();
    } catch (error) {
      await showFailure("Failed to save work log", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (selectableProjects.length === 0) {
    return <Detail markdown="# No Active Projects\n\nAdd or enable a project before creating a work log." />;
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={workLog ? "Save Work Log" : "Add Work Log"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <ProjectDropdown projects={selectableProjects} categories={categories} defaultValue={workLog?.projectId} />
      <Form.TextField id="description" title="Description" placeholder="Optional" defaultValue={workLog?.description} />
      <Form.DatePicker
        id="startedAt"
        title="Started At"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={workLog ? new Date(workLog.startedAt) : defaultStart}
      />
      <Form.DatePicker
        id="endedAt"
        title="Ended At"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={workLog ? new Date(workLog.endedAt) : now}
      />
    </Form>
  );
}

function ProjectDropdown({
  projects,
  categories,
  defaultValue,
}: {
  projects: Project[];
  categories: ProjectCategory[];
  defaultValue?: string;
}) {
  const preferredProjects = projects.filter((project) => project.isPreferred);

  return (
    <Form.Dropdown id="projectId" title="Project" defaultValue={defaultValue ?? projects[0]?.id}>
      {preferredProjects.length > 0 ? (
        <Form.Dropdown.Section title="PREFERRED">
          {preferredProjects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} icon={Icon.Star} />
          ))}
        </Form.Dropdown.Section>
      ) : null}
      {categories.map((category) => {
        const categoryProjects = projects.filter((project) => project.type === category.id && !project.isPreferred);
        return categoryProjects.length > 0 ? (
          <Form.Dropdown.Section key={category.id} title={category.name.toUpperCase()}>
            {categoryProjects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={project.id}
                title={project.isActive ? project.name : `${project.name} (Disabled)`}
                icon={getCategoryIcon(category.id)}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null;
      })}
    </Form.Dropdown>
  );
}

function groupLogsByDay(workLogs: WorkLog[]): Array<{ key: string; title: string; logs: WorkLog[] }> {
  const today = new Date();
  const groups = new Map<string, WorkLog[]>();

  for (const workLog of workLogs) {
    const date = new Date(workLog.startedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key) ?? [];
    group.push(workLog);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, logs]) => {
    const date = new Date(logs[0].startedAt);
    return {
      key,
      title: isSameLocalDay(date, today) ? "TODAY" : formatLogDate(logs[0].startedAt).toUpperCase(),
      logs,
    };
  });
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}
