import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { buildTaskPatch, fetchProjects, getWebUrl, updateTask } from "../lib/api";
import { getStatusLabel, getTaskIcon, isInTodayPlan, TASK_PRIORITY, TASK_STATUS } from "../lib/constants";
import type { Project, Task } from "../lib/types";

const TOGGLE_TODAY_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "t" },
  Windows: { modifiers: ["ctrl"], key: "t" },
};

type TaskListViewProps = {
  fetchTasks: () => Promise<Task[]>;
  emptyTitle?: string;
};

function projectNameFor(task: Task, projects: Project[]): string | undefined {
  if (task.Project?.name) return task.Project.name;
  if (!task.project_id) return undefined;
  return projects.find((p) => p.id === task.project_id)?.name;
}

function formatDueDate(dueDate?: string | null): string | undefined {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleDateString();
}

function StatusPriorityActions({
  task,
  updateTaskStatus,
  updateTaskPriority,
}: Readonly<{
  task: Task;
  updateTaskStatus: (task: Task, newStatus: number) => Promise<void>;
  updateTaskPriority: (task: Task, newPriority: number) => Promise<void>;
}>) {
  return (
    <>
      <ActionPanel.Submenu title="Change Status" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Duplicate}>
        <Action title="Not Started" onAction={() => updateTaskStatus(task, TASK_STATUS.NOT_STARTED)} />
        <Action title="In Progress" onAction={() => updateTaskStatus(task, TASK_STATUS.IN_PROGRESS)} />
        <Action title="Planned" onAction={() => updateTaskStatus(task, TASK_STATUS.PLANNED)} />
        <Action title="Waiting" onAction={() => updateTaskStatus(task, TASK_STATUS.WAITING)} />
        <Action title="Done" onAction={() => updateTaskStatus(task, TASK_STATUS.DONE)} />
        <Action title="Archived" onAction={() => updateTaskStatus(task, TASK_STATUS.ARCHIVED)} />
        <Action title="Cancelled" onAction={() => updateTaskStatus(task, TASK_STATUS.CANCELLED)} />
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Change Priority" icon={Icon.Flag}>
        <Action
          title="Low"
          icon={{ source: Icon.Circle, tintColor: Color.Blue }}
          onAction={() => updateTaskPriority(task, TASK_PRIORITY.LOW)}
        />
        <Action
          title="Medium"
          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
          onAction={() => updateTaskPriority(task, TASK_PRIORITY.MEDIUM)}
        />
        <Action
          title="High"
          icon={{ source: Icon.Circle, tintColor: Color.Red }}
          onAction={() => updateTaskPriority(task, TASK_PRIORITY.HIGH)}
        />
      </ActionPanel.Submenu>
    </>
  );
}

export function TaskListView({ fetchTasks, emptyTitle = "No tasks found" }: Readonly<TaskListViewProps>) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("");

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
    mutate: mutateTasks,
  } = useCachedPromise(fetchTasks, [], { keepPreviousData: true });

  const { data: projects = [], isLoading: projectsLoading } = useCachedPromise(fetchProjects, [], {
    keepPreviousData: true,
  });

  let currentFilterValue = "status-all";
  if (statusFilter !== "all") {
    currentFilterValue = `status-${statusFilter}`;
  } else if (projectFilter) {
    currentFilterValue = `project-${projectFilter}`;
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatch = statusFilter === "all" || task.status.toString() === statusFilter;
      const projectMatch =
        !projectFilter ||
        (projectFilter === "no-project" ? !task.project_id : task.project_id?.toString() === projectFilter);
      return statusMatch && projectMatch;
    });
  }, [tasks, statusFilter, projectFilter]);

  async function applyTaskUpdate(task: Task, changes: Partial<Pick<Task, "status" | "priority">>) {
    try {
      const updated = await mutateTasks(updateTask(task.uid, buildTaskPatch(task, changes)), {
        optimisticUpdate: (data) => (data ?? []).map((t) => (t.uid === task.uid ? { ...t, ...changes } : t)),
        rollbackOnError: true,
      });
      return updated;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: (error as Error).message,
      });
      throw error;
    }
  }

  async function updateTaskStatus(task: Task, newStatus: number) {
    await applyTaskUpdate(task, { status: newStatus });
    showToast({
      style: Toast.Style.Success,
      title: `Task marked as ${getStatusLabel(newStatus).toLowerCase()}`,
    });
  }

  async function updateTaskPriority(task: Task, newPriority: number) {
    await applyTaskUpdate(task, { priority: newPriority });
    const labels = ["low", "medium", "high"];
    showToast({
      style: Toast.Style.Success,
      title: `Task priority set to ${labels[newPriority] ?? "low"}`,
    });
  }

  async function toggleTodayPlan(task: Task) {
    const currentlyInPlan = isInTodayPlan(task.status);
    const newStatus = currentlyInPlan ? TASK_STATUS.NOT_STARTED : TASK_STATUS.PLANNED;
    await applyTaskUpdate(task, { status: newStatus });
    showToast({
      style: Toast.Style.Success,
      title: currentlyInPlan ? "Removed from today plan" : "Added to today plan",
    });
  }

  function handleFilterChange(value: string) {
    if (value.startsWith("status-")) {
      setStatusFilter(value.slice(7));
      setProjectFilter("");
    } else if (value.startsWith("project-")) {
      setProjectFilter(value.slice(8));
      setStatusFilter("all");
    }
  }

  if (tasksError) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Failed to load tasks" description={(tasksError as Error).message} />
      </List>
    );
  }

  return (
    <List
      isLoading={tasksLoading || projectsLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Tasks" value={currentFilterValue} onChange={handleFilterChange}>
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All" value="status-all" />
            <List.Dropdown.Item title="Not Started" value="status-0" />
            <List.Dropdown.Item title="In Progress" value="status-1" />
            <List.Dropdown.Item title="Done" value="status-2" />
            <List.Dropdown.Item title="Archived" value="status-3" />
            <List.Dropdown.Item title="Waiting" value="status-4" />
            <List.Dropdown.Item title="Cancelled" value="status-5" />
            <List.Dropdown.Item title="Planned" value="status-6" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Project">
            <List.Dropdown.Item title="All Projects" value="project-" />
            <List.Dropdown.Item title="No Project" value="project-no-project" />
            {projects.map((project) => (
              <List.Dropdown.Item key={`project-${project.id}`} value={`project-${project.id}`} title={project.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && !tasksLoading ? (
        <List.EmptyView icon={Icon.CheckCircle} title={emptyTitle} />
      ) : (
        filteredTasks.map((task) => {
          const projectName = projectNameFor(task, projects);
          const due = formatDueDate(task.due_date);
          const inPlan = isInTodayPlan(task.status);
          return (
            <List.Item
              key={task.uid}
              icon={getTaskIcon(task.status, task.priority)}
              title={task.name}
              subtitle={task.note}
              accessories={[
                ...(inPlan ? [{ icon: Icon.Calendar, tooltip: "In today plan" }] : []),
                { text: getStatusLabel(task.status) },
                ...(projectName ? [{ icon: Icon.Folder, text: projectName }] : []),
                ...(due ? [{ text: due }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Eye}
                    target={
                      <TaskDetail
                        task={task}
                        projects={projects}
                        updateTaskStatus={updateTaskStatus}
                        updateTaskPriority={updateTaskPriority}
                        toggleTodayPlan={toggleTodayPlan}
                      />
                    }
                  />
                  <Action
                    title={inPlan ? "Remove from Today Plan" : "Add to Today Plan"}
                    icon={Icon.Calendar}
                    shortcut={TOGGLE_TODAY_SHORTCUT}
                    onAction={() => toggleTodayPlan(task)}
                  />
                  <Action.OpenInBrowser title="Open in Browser" url={getWebUrl(`/task/${task.uid}`)} />
                  <StatusPriorityActions
                    task={task}
                    updateTaskStatus={updateTaskStatus}
                    updateTaskPriority={updateTaskPriority}
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

function TaskDetail({
  task,
  projects,
  updateTaskStatus,
  updateTaskPriority,
  toggleTodayPlan,
}: Readonly<{
  task: Task;
  projects: Project[];
  updateTaskStatus: (task: Task, newStatus: number) => Promise<void>;
  updateTaskPriority: (task: Task, newPriority: number) => Promise<void>;
  toggleTodayPlan: (task: Task) => Promise<void>;
}>) {
  const { pop } = useNavigation();
  const projectName = projectNameFor(task, projects);
  const tagsText = task.tags?.map((t) => t.name).join(", ") || null;
  const due = formatDueDate(task.due_date);
  const inPlan = isInTodayPlan(task.status);
  const isCompleted = task.status === TASK_STATUS.DONE;

  const metaParts: string[] = [];
  if (projectName) metaParts.push(`📁 ${projectName}`);
  if (tagsText) metaParts.push(`🏷️ ${tagsText}`);
  const metaLine = metaParts.length > 0 ? `${metaParts.join(" | ")}\n\n` : "";
  const dueLine = due ? `\n**Due Date:** ${due}` : "";
  const todayLine = inPlan ? "**In Today Plan**\n\n" : "";

  const markdown = `# ${task.name}

**Status:** ${getStatusLabel(task.status)}${dueLine}

${metaLine}${todayLine}${task.note || "No notes available."}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={getStatusLabel(task.status)} />
          <Detail.Metadata.Label title="Priority" text={["Low", "Medium", "High"][task.priority] ?? "Low"} />
          {due && <Detail.Metadata.Label title="Due" text={due} />}
          {projectName && <Detail.Metadata.Label title="Project" text={projectName} />}
          {tagsText && (
            <Detail.Metadata.TagList title="Tags">
              {task.tags?.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.uid} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={isCompleted ? "Mark as Not Started" : "Complete Task"}
            icon={isCompleted ? Icon.Circle : Icon.CheckCircle}
            onAction={async () => {
              await updateTaskStatus(task, isCompleted ? TASK_STATUS.NOT_STARTED : TASK_STATUS.DONE);
              pop();
            }}
          />
          <Action
            title={inPlan ? "Remove from Today Plan" : "Add to Today Plan"}
            icon={Icon.Calendar}
            shortcut={TOGGLE_TODAY_SHORTCUT}
            onAction={() => toggleTodayPlan(task)}
          />
          <Action.OpenInBrowser title="Open in Browser" url={getWebUrl(`/task/${task.uid}`)} />
          <StatusPriorityActions
            task={task}
            updateTaskStatus={updateTaskStatus}
            updateTaskPriority={updateTaskPriority}
          />
        </ActionPanel>
      }
    />
  );
}
