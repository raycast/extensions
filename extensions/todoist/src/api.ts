import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import { TodoistApi, TodoistRequestError } from "@doist/todoist-api-typescript";

const preferences = getPreferenceValues();

export const todoist = new TodoistApi(preferences.token);

interface HandleErrorArgs {
  error: TodoistRequestError | unknown;
  title: string;
}

export function handleError({ error, title }: HandleErrorArgs) {
  if (error instanceof TodoistRequestError && error.isAuthenticationError()) {
    return showToast(ToastStyle.Failure, title, "Please, make sure your Todoist token is correct.");
  }

  return showToast(ToastStyle.Failure, title, error instanceof Error ? error.message : "");
}
