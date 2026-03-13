import { closeMainWindow, LaunchProps, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { NotifyOptions, notificationCenter, preparePrebuilds } from "raycast-notifier";

type LaunchContext = {
  notifyOptions?: NotifyOptions;
  callbackLaunchOptions?: LaunchOptions;
};

export default async function main(props: LaunchProps<{ arguments: Arguments.Index; launchContext: LaunchContext }>) {
  const {
    arguments: { title, message, type },
    launchType,
    launchContext = {},
  } = props;
  const { notifyOptions, callbackLaunchOptions } = launchContext;

  let notificationType = type ?? "standard";
  if (launchType === LaunchType.UserInitiated) {
    await closeMainWindow();
  } else {
    //  Toast API is not available when command is launched in the background.
    notificationType = "standard";
  }

  if (notifyOptions || notificationType === "notification-center") {
    await preparePrebuilds();
    const notifyResult = await notificationCenter({
      title: title,
      message: message || " ",
      ...notifyOptions,
    });
    if (callbackLaunchOptions) {
      callbackLaunchCommand(callbackLaunchOptions, { notifyResult });
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
    default:
      await showHUD(title);
  }
}
