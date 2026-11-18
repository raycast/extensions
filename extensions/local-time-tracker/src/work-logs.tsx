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
import { TimeEditor } from "./components/time-editor";
import type { TimeDraft } from "./lib/time-editing";
import { formatLogDate, formatTime, isSameLocalDay } from "./lib/date";
import { getProjectGroupIcon, getProjectGroupName } from "./lib/project-groups";
import { formatDuration, getDurationSeconds } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { findProject, getProjectName, sortProjectsByPreference } from "./lib/projects";
import { deleteWorkLog, getProjectGroups, getProjects, getWorkLogs, upsertWorkLog } from "./lib/storage";
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
        getProjectGroups(),
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
      target={<WorkLogEditor projects={projects} categories={categories} onSaved={async () => reload()} />}
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
                icon={getProjectGroupIcon(categories, findProject(projects, workLog.projectId)?.type ?? "")}
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
            title="Project Group"
            text={project ? getProjectGroupName(categories, project.type) : "Unknown"}
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
              <WorkLogEditor
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

function WorkLogEditor({
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
  const selectableProjects = useMemo(
    () => sortProjectsByPreference(projects.filter((project) => project.isActive || project.id === workLog?.projectId)),
    [projects, workLog?.projectId],
  );
  const [details, setDetails] = useState({
    projectId: workLog?.projectId ?? selectableProjects[0]?.id ?? "",
    description: workLog?.description ?? "",
  });
  const [initialTimes] = useState(() => {
    const end = new Date();
    end.setSeconds(0, 0);
    return {
      startedAt: workLog?.startedAt ?? new Date(end.getTime() - 60 * 60000).toISOString(),
      endedAt: workLog?.endedAt ?? end.toISOString(),
    };
  });
  const project = findProject(projects, details.projectId);

  async function save(times: TimeDraft) {
    if (!project || (!workLog && !project.isActive)) throw new Error("Select an available project");
    if (!times.endedAt) throw new Error("A work log needs an end time");
    const savedAt = new Date().toISOString();
    const nextLog: WorkLog = {
      id: workLog?.id ?? crypto.randomUUID(),
      projectId: project.id,
      description: details.description.trim(),
      ...(workLog?.plan ? { plan: workLog.plan } : {}),
      startedAt: times.startedAt,
      endedAt: times.endedAt,
      createdAt: workLog?.createdAt ?? savedAt,
      updatedAt: savedAt,
    };
    await upsertWorkLog(nextLog);
    await onSaved(nextLog);
  }

  if (selectableProjects.length === 0) {
    return <Detail markdown={"# No Active Projects\n\nAdd or enable a project before creating a work log."} />;
  }

  return (
    <TimeEditor
      title={workLog ? "Edit Work Log" : "Add Work Log"}
      initialTimes={initialTimes}
      saveTitle={workLog ? "Save Work Log" : "Add Work Log"}
      successTitle={workLog ? "Work log updated" : "Work log added"}
      onSave={save}
      metadata={
        <>
          <Detail.Metadata.Label title="Project" text={project?.name ?? "Unknown Project"} />
          <Detail.Metadata.Label
            title="Project Group"
            text={project ? getProjectGroupName(categories, project.type) : "Unknown"}
          />
          {details.description.trim() ? <Detail.Metadata.Label title="Description" text={details.description} /> : null}
          <Detail.Metadata.Separator />
        </>
      }
      extraActions={
        <ActionPanel.Section>
          <Action.Push
            title="Edit Project and Description"
            icon={Icon.Text}
            target={
              <WorkLogDetailsForm
                projects={selectableProjects}
                categories={categories}
                details={details}
                onApply={setDetails}
              />
            }
          />
        </ActionPanel.Section>
      }
    />
  );
}

function WorkLogDetailsForm({
  projects,
  categories,
  details,
  onApply,
}: {
  projects: Project[];
  categories: ProjectCategory[];
  details: { projectId: string; description: string };
  onApply: (details: { projectId: string; description: string }) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Edit Project and Description"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply to Preview"
            onSubmit={(values: { projectId: string; description: string }) => {
              onApply({ projectId: values.projectId, description: values.description.trim() });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <ProjectDropdown projects={projects} categories={categories} defaultValue={details.projectId} />
      <Form.TextField id="description" title="Description" placeholder="Optional" defaultValue={details.description} />
      <Form.Description text="Apply returns to the numeric preview. Your record is updated only when you choose Save." />
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
                icon={getProjectGroupIcon(categories, category.id)}
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
