import { showToast, Toast } from "@raycast/api";
import { createTimeEntry, stopTimeEntry, Me, TogglProject } from "@/api";
import { Task, Project } from "@doist/todoist-api-typescript";
import { todoistApiToken } from "@/helpers/preferences";

export async function startTogglTimer(
  task: Task,
  todoistProjects: Project[] | undefined,
  togglMe: Me,
  togglProjects: TogglProject[],
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
    if (!task.id) {
      throw new Error("Task is missing an ID");
    }
    await addTodoistComment({
      taskId: String(task.id),
      content: `@timerID:${timeEntryData.id}`,
      token: todoistApiToken,
    });
    refreshTimer();
    showToast({ style: Toast.Style.Success, title: `${task.content} is tracking in Toggl` });
  } catch (error) {
    console.log(error);
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

export async function addTodoistComment({
  taskId,
  content,
  token,
}: {
  taskId: string;
  content: string;
  token: string;
}) {
  const response = await fetch(`https://api.todoist.com/rest/v2/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_id: taskId,
      content: content,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add comment: ${response.status} ${errorText}`);
  }

  return await response.json();
}
