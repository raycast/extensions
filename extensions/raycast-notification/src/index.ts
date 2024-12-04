import { closeMainWindow, LaunchProps, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { NotifyOptions, notificationCenter, preparePrebuilds } from "raycast-notifier";

type LaunchContext = {
  notificationCenterOptions?: NotifyOptions;
  callbackLaunchOptions?: LaunchOptions;
};

export default async function main(props: LaunchProps<{ arguments: Arguments.Index; launchContext: LaunchContext }>) {
  const {
    arguments: { title, message, type },
    launchType,
    launchContext = {},
  } = props;
  const { notificationCenterOptions, callbackLaunchOptions } = launchContext;

  let notificationType = type ?? "standard";
  if (launchType === LaunchType.UserInitiated) {
    await closeMainWindow();
  } else {
    //  Toast API is not available when command is launched in the background.
    notificationType = "standard";
  }

  if (notificationCenterOptions) {
    await preparePrebuilds();
    const result = await notificationCenter({
      title: title,
      message: message || " ",
      ...notificationCenterOptions,
    });
    if (callbackLaunchOptions) {
      callbackLaunchCommand(callbackLaunchOptions, { result });
    }
    return;
  }

  switch (notificationType) {
    case "success":
      await showToast(Toast.Style.Success, title);
      break;
    case "failure":
      await showToast(Toast.Style.Failure, title);
      break;
    case "notification-center": {
      break;
    }
    default:
      await showHUD(title);
  }
}
