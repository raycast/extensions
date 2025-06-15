import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { HakunaTimer } from "./hakuna-api";

interface Preferences {
  apiToken: string;
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

  try {
    const overtime = await timer.getOvertime();
    await showToast({
      style: Toast.Style.Success,
      title: "Total Overtime",
      message: `Your total overtime is ${overtime}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error details:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error getting overtime",
        message: error.message,
      });
    } else {
      console.error("Unknown error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error getting overtime",
        message: "An unknown error occurred. Check the logs for more details.",
      });
    }
  }
}
