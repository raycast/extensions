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
  const comments = await todoistApi.getComments({ taskId: task.id });
  let taskDuration = 0;
  for (const comment of comments.results) {
    if (comment.content.includes("@timerID:")) {
      const match = comment.content.match(/@timerID:(\d+)/);
      const timerId = match ? match[1] : null;
      const timeEntry = await justTimeEntry(Number(timerId));
      const tmpDuration = timeEntry.duration;
      if (tmpDuration > 0) taskDuration += tmpDuration;
    }
  }
  await todoistApi.updateTask(task.id, { duration: taskDuration, durationUnit: "minute" });
  mutate();
  showToast({ style: Toast.Style.Success, title: "Completed" });
}
