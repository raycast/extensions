import { Task, TodoistApi } from "@doist/todoist-api-typescript";
import { showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { todoistApiToken } from "./preferences";
import { justTimeEntry } from "@/api/timeEntries";

dayjs.extend(duration);
const todoistApi = new TodoistApi(todoistApiToken);

export async function sumTaskTimer(task: Task, mutate: () => void) {
  showToast({ style: Toast.Style.Animated, title: "Calculating time from the task comments." });
  const taskId = task.id;
  if (taskId === undefined) return;
  const comments = await getTodoistComments({ taskId, token: todoistApiToken });
  let taskDuration = 0;
  if (comments === undefined) return;
  for (const comment of comments) {
    if (comment.content.includes("@timerID:")) {
      try {
        const match = comment.content.match(/@timerID:(\d+)/);
        const timerId = match ? match[1] : null;
        if (!timerId) continue;
        const timeEntry = await justTimeEntry(Number(timerId));
        const tmpDuration = timeEntry?.duration;
        if (tmpDuration > 0) taskDuration += tmpDuration;
      } catch (error) {
        console.error(error);
        continue;
      }
    }
  }
  if (taskDuration > 0) {
    await todoistApi.updateTask(task.id, { duration: taskDuration, durationUnit: "minute" });
  } else {
    showToast({ style: Toast.Style.Failure, title: "This task has not been tracked yet." });
  }
  mutate();
  showToast({ style: Toast.Style.Success, title: "Completed" });
}

export async function getTodoistComments({ taskId, token }: { taskId: string; token: string }) {
  const response = await fetch(`https://api.todoist.com/rest/v2/comments?task_id=${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get comments: ${response.status} ${errorText}`);
  }
  return await response.json();
}
