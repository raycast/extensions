import { getApplications } from "@raycast/api";

export let isTodoistInstalled = false;

export async function checkTodoistApp() {
  const applications = await getApplications();
  const todoistApp = applications.find((app) => app.bundleId === "com.todoist.mac.Todoist");
  isTodoistInstalled = !!todoistApp;
}
