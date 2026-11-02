import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getCommandSubtitle } from "./utils/progress";
import { readProgress } from "./utils/progress-store";

export default async function Command() {
  const snapshot = await readProgress();
  const subtitle = getCommandSubtitle(snapshot);
  if (!subtitle) throw new Error("Year progress is unavailable. Reopen X in Progress to reload your progress.");
  await updateCommandMetadata({ subtitle });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({ style: Toast.Style.Success, title: "Progress Refreshed", message: subtitle });
  }
}
