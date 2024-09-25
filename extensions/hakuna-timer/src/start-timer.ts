import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { HakunaTimer } from "./hakuna-api";

interface Preferences {
  apiToken: string;
  defaultTaskId: string;
  defaultProjectId: string;
}

export default async function command() {
  const preferences = getPreferenceValues<Preferences>();
  const timer = new HakunaTimer(preferences.apiToken);

  try {
    await timer.startTimer(
      preferences.defaultTaskId || "",
      preferences.defaultProjectId || "",
    );
    await showToast({
      title: "Timer started",
      message: `Task ID: ${preferences.defaultTaskId || "Not specified"}, Project ID: ${preferences.defaultProjectId || "Not specified"}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error starting timer",
        message: error.message,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error starting timer",
        message: "An unknown error occurred",
      });
    }
  }
}
