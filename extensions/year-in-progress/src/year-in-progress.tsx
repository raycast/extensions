import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getDefaultProgress, getProgressNumber, getProgressSubtitle } from "./utils/progress";

export default async function command() {
  const yearInProgress = getDefaultProgress()[0];
  const progressNumber = getProgressNumber(yearInProgress);
  const progressBar = getProgressSubtitle(progressNumber);

  updateCommandMetadata({ subtitle: `${progressBar}` });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed progress",
      message: `${progressBar}`,
    });
  }
}
