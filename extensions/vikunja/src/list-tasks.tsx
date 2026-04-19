import {
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  getProjects,
  getProjectTasks,
  getAllTasks,
  toggleTaskDone,
  deleteTask,
  Task,
} from "./api";
import { TaskListItem } from "./components/task-list-item";

interface ListTasksContext {
  projectId?: number;
}

export default function ListTasks(
  props: LaunchProps<{ launchContext: ListTasksContext }>,
) {
  const initialProjectId = props.launchContext?.projectId;
  const [selectedProject, setSelectedProject] = useState<string>(
    initialProjectId ? String(initialProjectId) : "all",
  );

  const baseUrl = useMemo(() => {
    const { apiUrl } = getPreferenceValues<Preferences>();
    return apiUrl.replace(/\/+$/, "");
  }, []);

  const { data: projects, isLoading: projectsLoading } = useCachedPromise(
    getProjects,
    [],
    { keepPreviousData: true },
  );

  const {
    data: tasks,
    isLoading: tasksLoading,
    revalidate,
    error: tasksError,
  } = useCachedPromise(
    (projectId: string) =>
      projectId === "all"
        ? getAllTasks()
        : getProjectTasks(parseInt(projectId)),
    [selectedProject],
    { keepPreviousData: true },
  );

  async function handleToggleDone(task: Task) {
    try {
      await toggleTaskDone(task);
      showToast({
        style: Toast.Style.Success,
        title: task.done ? "Task reopened" : "Task completed",
      });
      revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(task: Task) {
    if (
      await confirmAlert({
        title: `Delete "${task.title}"?`,
        message: "This cannot be undone.",
      })
    ) {
      try {
        await deleteTask(task.id);
        showToast({ style: Toast.Style.Success, title: "Task deleted" });
        revalidate();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const isLoading = projectsLoading || tasksLoading;
  const taskList = tasks ?? [];
  const projectList = projects ?? [];
  const openTasks = taskList.filter((t) => !t.done);
  const doneTasks = taskList.filter((t) => t.done);

  const showEmptyView =
    !isLoading && (tasksError !== undefined || taskList.length === 0);
  let emptyTitle = "No tasks";
  let emptyDescription =
    selectedProject === "all"
      ? "There are no tasks in your Vikunja instance yet."
      : "There are no tasks in this project. Try another project or create tasks in Vikunja.";
  if (tasksError) {
    emptyTitle = "Failed to load tasks";
    emptyDescription =
      tasksError instanceof Error ? tasksError.message : "Unknown error";
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={selectedProject}
          onChange={setSelectedProject}
        >
          <List.Dropdown.Item key="all" value="all" title="All Projects" />
          {projectList.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              value={String(project.id)}
              title={project.title}
            />
          ))}
        </List.Dropdown>
      }
    >
      {showEmptyView ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={tasksError ? Icon.Warning : Icon.Tray}
        />
      ) : (
        <>
          <List.Section title="Open" subtitle={`${openTasks.length} tasks`}>
            {openTasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                baseUrl={baseUrl}
                projects={projectList}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
          {doneTasks.length > 0 && (
            <List.Section title="Done" subtitle={`${doneTasks.length} tasks`}>
              {doneTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  baseUrl={baseUrl}
                  projects={projectList}
                  onToggleDone={handleToggleDone}
                  onDelete={handleDelete}
                  onRefresh={revalidate}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
