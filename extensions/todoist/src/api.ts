import { environment, getPreferenceValues, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { TodoistApi, TodoistRequestError } from "@doist/todoist-api-typescript";

const preferences = getPreferenceValues();

export const todoist = new TodoistApi(preferences.token);

interface HandleErrorArgs {
  error: TodoistRequestError | unknown;
  title: string;
}

export function handleError({ error, title }: HandleErrorArgs) {
  if (environment.commandMode === "menu-bar") {
    if (environment.launchType === LaunchType.UserInitiated) {
      return showHUD(title);
    } else {
      return;
    }
  }

  if (error instanceof TodoistRequestError && error.isAuthenticationError()) {
    return showToast({
      style: Toast.Style.Failure,
      title: title,
      message: "Please, make sure your Todoist token is correct.",
    });
  }

  return showToast({
    style: Toast.Style.Failure,
    title: title,
    message: error instanceof Error ? error.message : "",
  });
}
