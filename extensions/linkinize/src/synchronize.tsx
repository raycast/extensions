import { LaunchType, Toast, environment, launchCommand, showToast } from "@raycast/api";
import { authenticationCheck, performSync } from "./support";

export default async function Command() {
  const authenticated = await authenticationCheck();
  if (!authenticated) {
    return;
  }
  const synced = await performSync();
  if (synced) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({ title: "Synced", message: "Bookmarks updated.", style: Toast.Style.Success });
      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    }
  }
}
