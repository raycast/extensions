import { open, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getTrackingState } from "./storage";
import { Preferences } from "./types";

export default async function Command() {
  const state = await getTrackingState();
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();

  if (!state.isTracking || !state.issueKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Issue Being Tracked",
      message: "Start tracking an issue first",
    });
    return;
  }

  await open(`${jiraBaseUrl}/browse/${state.issueKey}`);
}
