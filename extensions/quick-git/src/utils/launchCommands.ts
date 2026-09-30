import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export function launchQuickGit() {
  launchCommand({
    name: "quick-git",
    type: LaunchType.UserInitiated,
  }).catch((error) => {
    showFailureToast(error, {
      title: "Could not launch the Quick Git command",
    });
  });
}

export function launchSetRepo() {
  launchCommand({
    name: "set-repo",
    type: LaunchType.UserInitiated,
  }).catch((error) => {
    showFailureToast(error, {
      title: "Could not launch the Set Repo command",
    });
  });
}
