import { Task, TodoistApi } from "@doist/todoist-api-typescript";
import { showToast, Toast } from "@raycast/api";
import { todoistApiToken } from "./preferences";

const todoistApi = new TodoistApi(todoistApiToken);

export async function todoCompleted(task: Task, mutate: () => void) {
  try {
    await todoistApi.closeTask(task.id);
    showToast({ style: Toast.Style.Success, title: "Task Completed" });
    mutate();
  } catch (error) {
    console.log(error);
  }
}
