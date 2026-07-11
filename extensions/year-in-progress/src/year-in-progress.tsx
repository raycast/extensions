import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { Progress } from "./types";
import { getSubtitle } from "./utils/progress";
import { getLatestXProgress } from "./hooks/use-local-storage-progress";

export default async function Command() {
  const storedAllProgress = await getLatestXProgress();
  let progress = storedAllProgress.allProgress.find((p) => p.showAsCommand) as Progress;
  if (!progress) {
    progress = storedAllProgress.allProgress.find((p) => p.title === "Year In Progress") as Progress;
  }
  const progressBar = getSubtitle(progress.progressNum);

  updateCommandMetadata({ subtitle: `${progress.menubar.title} ${progressBar}` });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed progress",
      message: `${progressBar}`,
    });
  }
}
