import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";

export async function showError(message: string) {
  if (environment.launchType === LaunchType.Background) {
    await showHUD(message);
  } else {
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}
