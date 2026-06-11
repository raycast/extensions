import {
  getLatestDownload,
  hasAccessToDownloadsFolder,
  deleteFileOrFolder,
  getDeletionBehavior,
  getPermanentDeleteConfirmationChoice,
} from "./utils";
import { closeMainWindow, environment, LaunchType, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  const isBackgroundLaunch = environment.launchType === LaunchType.Background;

  if (!hasAccessToDownloadsFolder()) {
    if (isBackgroundLaunch) {
      return;
    }
    await showHUD("No permission to access the downloads folder");
    return;
  }

  const latestDownload = getLatestDownload();
  if (!latestDownload) {
    if (isBackgroundLaunch) {
      return;
    }
    await showHUD("No downloads found");
    return;
  }

  const deletionBehavior = await getDeletionBehavior();
  const permanentDeleteChoice = isBackgroundLaunch ? await getPermanentDeleteConfirmationChoice() : undefined;

  if (isBackgroundLaunch && deletionBehavior !== "trash" && permanentDeleteChoice !== "delete") {
    return;
  }

  try {
    await deleteFileOrFolder(latestDownload.path, {
      confirmationMessage:
        "Are you sure you want to permanently delete the latest download? This action cannot be undone.",
      deletionBehavior,
      feedback: isBackgroundLaunch ? "none" : "hud",
      skipConfirmation: isBackgroundLaunch && permanentDeleteChoice === "delete",
      beforeFeedback: isBackgroundLaunch
        ? undefined
        : () => closeMainWindow({ popToRootType: PopToRootType.Suspended }),
    });
  } catch (error) {
    if (isBackgroundLaunch) {
      console.error(error);
      return;
    }
    await showFailureToast(error, { title: "Deletion Failed" });
  }
}
