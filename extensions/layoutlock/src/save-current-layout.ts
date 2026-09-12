import { environment, getApplications, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import {
  canDispatchToLayoutLock,
  dispatchCaptureToCompatibleLayoutLock,
  layoutIndexRecoveryMessage,
  LayoutLockNotInstalledError,
  layoutLockTarget,
} from "./layoutlock";

export default async function SaveCurrentLayout(props: LaunchProps<{ arguments: Arguments.SaveCurrentLayout }>) {
  try {
    const applications = await getApplications();
    const target = layoutLockTarget(environment.isDevelopment);
    if (!canDispatchToLayoutLock(applications, target, environment.isDevelopment)) {
      throw new LayoutLockNotInstalledError("Install LayoutLock before saving a layout.");
    }
    await dispatchCaptureToCompatibleLayoutLock(props.arguments.name, target);
    await showHUD("Save requested");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not request save",
      message: layoutIndexRecoveryMessage(error) ?? (error instanceof Error ? error.message : String(error)),
    });
  }
}
