import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { HakunaTimer } from "./hakuna-api";

interface Preferences {
  apiToken: string;
  defaultTaskId?: string;
  defaultProjectId?: string;
}

export default async function command() {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiToken) {
    await showToast({
      style: Toast.Style.Failure,
      title: "API Token missing",
      message: "Please set your Hakuna API Token in the extension preferences",
    });
    return;
  }

  const timer = new HakunaTimer(preferences.apiToken);

  if (!preferences.defaultTaskId) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing information",
      message: "Please set Default Task ID in the extension preferences",
    });
    return;
  }

  try {
    await timer.startTimer(
      preferences.defaultTaskId,
      preferences.defaultProjectId,
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Timer started",
      message: `Task ID: ${preferences.defaultTaskId}${preferences.defaultProjectId ? `, Project ID: ${preferences.defaultProjectId}` : ""}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error details:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error starting timer",
        message: error.message,
      });
    } else {
      console.error("Unknown error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error starting timer",
        message: "An unknown error occurred. Check the logs for more details.",
      });
    }
  }
}
