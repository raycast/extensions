import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { HakunaTimer } from "./hakuna-api";

interface Preferences {
  apiToken: string;
}

export default async function command() {
  const preferences = getPreferenceValues<Preferences>();
  const timer = new HakunaTimer(preferences.apiToken);

  try {
    const result = await timer.stopTimer();
    await showToast({ title: "Timer stopped", message: result.message || "Success" });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error stopping timer" });
  }
}
