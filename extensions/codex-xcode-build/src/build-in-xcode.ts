import { basename } from "node:path";
import { closeMainWindow, getPreferenceValues, showHUD, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  observeWorkspaceRunSession,
  readFocusedRepoRoot,
  restoreCodex,
  resolveXcodeTarget,
  startWorkspaceRunSession,
  type XcodeRunState,
  UserFacingError,
  workspaceLabel,
} from "./xcode-match";

type Preferences = {
  returnToCodex: boolean;
};

function buildingTitle(repoName: string) {
  return `Building ${repoName}...`;
}

function untrackedBuildTitle(repoName: string) {
  return `Started build for ${repoName}`;
}

function terminalTitle(repoName: string, state: XcodeRunState) {
  switch (state) {
    case "succeeded":
      return `Build succeeded for ${repoName}`;
    case "failed":
      return `Build failed for ${repoName}`;
    case "cancelled":
      return `Build cancelled for ${repoName}`;
    default:
      return `Couldn't confirm build result for ${repoName}`;
  }
}

export default async function command() {
  let toast: Toast | undefined;
  let repoName: string | undefined;
  let didStartTrackedRun = false;
  const preferences = getPreferenceValues<Preferences>();

  try {
    const repoRoot = readFocusedRepoRoot();
    repoName = basename(repoRoot);

    await closeMainWindow({ clearRootSearch: true });

    toast = await showToast({
      style: Toast.Style.Animated,
      title: buildingTitle(repoName),
    });

    const target = resolveXcodeTarget(repoRoot);
    toast.message = workspaceLabel(target.targetPath);

    let session;
    try {
      session = startWorkspaceRunSession(target);
    } finally {
      if (preferences.returnToCodex) {
        restoreCodex();
      }
    }

    if (!session.actionResultId) {
      await toast.hide();
      await showHUD(untrackedBuildTitle(repoName));
      return;
    }

    didStartTrackedRun = true;
    const result = observeWorkspaceRunSession(session);

    await toast.hide();
    await showHUD(terminalTitle(repoName, result.state === "building" ? "unknown" : result.state));
  } catch (error) {
    if (error instanceof UserFacingError) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = error.title;
        toast.message = error.detail;
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: error.title,
          message: error.detail,
        });
      }
      return;
    }

    if (toast && repoName && didStartTrackedRun) {
      await toast.hide();
      await showHUD(terminalTitle(repoName, "unknown"));
      return;
    }

    await showFailureToast(error, {
      title: "Couldn't start the Xcode run",
    });
  }
}
