import { closeMainWindow, LaunchProps, LaunchType, showHUD, showToast, Toast } from "@raycast/api";

export default async function main(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const {
    arguments: { title, type },
    launchType,
  } = props;

  let notificationType = type ?? "standard";
  if (launchType === LaunchType.UserInitiated) {
    await closeMainWindow();
  } else {
    //  Toast API is not available when command is launched in the background.
    notificationType = "standard";
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
