import { showToast, ToastStyle, Toast } from "@raycast/api";

import { State, Progress } from "@types";

export async function StoreToast(state: State, progress: Progress, message = ""): Promise<Toast> {
  let title = "";
  let style = ToastStyle.Animated;

  switch (state) {
    case State.Installed:
      {
        if (progress === Progress.InProgress) {
          title = "Uninstalling Script Command...";
          style = ToastStyle.Animated;
        } else {
          title = "Script Command uninstalled!";
          style = ToastStyle.Success;
        }
      }
      break;

    case State.NotInstalled:
      {
        if (progress === Progress.InProgress) {
          title = "Installing Script Command...";
          style = ToastStyle.Animated;
        } else {
          title = "Script Command installed!";
          style = ToastStyle.Success;
        }
      }
      break;

    case State.NeedSetup:
      {
        title = "Extra setup needed!";
        message = "You must edit the Script Command before you can use it";
        style = ToastStyle.Success;
      }
      break;

    case State.ChangesDetected:
      {
        title = "Changes Detected!";
        message = "Press Return to confirm your change and activate the Script Command.";
        style = ToastStyle.Success;
      }
      break;

    case State.Error:
      {
        title = "Error 😔";
        message = "Something went wrong";
        style = ToastStyle.Failure;
      }
      break;
  }

  return showToast(style, title, message);
}
