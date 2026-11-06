import {
  closeMainWindow,
  environment,
  getApplications,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { join } from "node:path";
import { CleftPreferences } from "./preferences";
import { CaptureAction, captureActions, runCapture } from "./shortcuts";

export async function captureCommand(action: CaptureAction) {
  try {
    const installed = (await getApplications()).some(
      (application) => application.bundleId === "com.cleft.notes",
    );
    if (!installed)
      throw new Error(
        "Install Cleft for Mac before using its capture commands.",
      );
    const preferences = getPreferenceValues<CleftPreferences>();
    const name = {
      start: preferences.startShortcut,
      stop: preferences.stopShortcut,
      continue: preferences.continueShortcut,
    }[action];
    await closeMainWindow();
    await runCapture(action, name);
    await showHUD(`Cleft ${captureActions[action].title} shortcut completed`);
  } catch (error) {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title: "Cleft Action Did Not Complete",
      message:
        error instanceof Error
          ? error.message
          : "Check Cleft and Apple Shortcuts.",
    });
    toast.primaryAction = {
      title: "Set Up Integration",
      onAction: async () => {
        await launchCommand({ name: "setup", type: LaunchType.UserInitiated });
      },
    };
    toast.secondaryAction = {
      title: "Install Native Shortcut",
      onAction: async () => {
        await open(
          join(
            environment.assetsPath,
            "shortcuts",
            captureActions[action].file,
          ),
        );
      },
    };
  }
}
