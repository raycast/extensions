import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";

export async function showErrorMessage(message: string) {
  if (environment.launchType === LaunchType.Background) {
    await showHUD(`❌ ${message}`);
  } else {
    await showToast({ style: Toast.Style.Failure, title: message });
  }
}

export async function showSuccessMessage(message: string) {
  if (environment.launchType === LaunchType.Background) {
    await showHUD(`✅ ${message}`);
  } else {
    await showToast({ style: Toast.Style.Success, title: message });
  }
}

export async function showAnimatedMessage(message: string) {
  if (environment.launchType !== LaunchType.Background) {
    await showToast({ style: Toast.Style.Animated, title: message });
  }
}
