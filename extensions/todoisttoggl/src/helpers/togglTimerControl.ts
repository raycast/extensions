import { showToast, Toast } from "@raycast/api";
import { createTimeEntry, stopTimeEntry, Me, togglProject } from "@/api";
import { Task, Project } from "@doist/todoist-api-typescript";
import { TodoistApi } from "@doist/todoist-api-typescript";
import { todoistApiToken } from "@/helpers/preferences";

const todoistApi = new TodoistApi(todoistApiToken);
export async function startTogglTimer(
  task: Task,
  todoistProjects: Project[] | undefined,
  togglMe: Me,
  togglProjects: togglProject[],
  refreshTimer: () => void,
) {
  const currentTodoistProject = todoistProjects?.find((project) => project.id === task.projectId);
  const togglProjectId = currentTodoistProject?.name.indexOf("@")
    ? currentTodoistProject?.name.slice(currentTodoistProject?.name.indexOf("@") + 1)
    : null;
  const currentTogglProject = togglProjects.find((project) => project.id === Number(togglProjectId));

  const now = new Date();
  const workspaceId = currentTogglProject ? currentTogglProject.workspace_id : togglMe.default_workspace_id;
  const togglTimerData = {
    workspaceId: workspaceId,
    description: task.content,
    start: now.toISOString(),
    created_with: "raycast-todoist-toggl",
    projectId: currentTogglProject ? currentTogglProject.id : undefined,
    duration: -1,
    tags: task.labels,
  };
  try {
    const timeEntryData = await createTimeEntry(togglTimerData);
    await todoistApi.addComment({ taskId: task.id, content: `@timerID:${timeEntryData.id}` });
    refreshTimer();
    showToast({ style: Toast.Style.Success, title: `${task.content} is tracking in Toggl` });
  } catch (error) {
    refreshTimer();
    showToast({ style: Toast.Style.Failure, title: "Faild to track in Toggl" });
  }
}

export async function stopTogglTimer(
  timeEntryId: number,
  workspaceId: number,
  refreshTimer: () => void,
  mutate: () => void,
) {
  try {
    await stopTimeEntry({ id: timeEntryId, workspaceId });
    showToast({ style: Toast.Style.Success, title: "Stopped tracking in Toggl" });
    refreshTimer();
    mutate();
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to stop tracking in Toggl" });
  }
}
