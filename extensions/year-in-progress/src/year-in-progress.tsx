import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { Progress } from "./types";
import { defaultProgress, getSubtitle } from "./utils/progress";

export default async function command() {
  const yearProgress = defaultProgress.find((p) => p.title === "Year In Progress") as Progress;
  const progressBar = getSubtitle(yearProgress.progressNum);

  updateCommandMetadata({ subtitle: `${progressBar}` });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed progress",
      message: `${progressBar}`,
    });
  }
}
