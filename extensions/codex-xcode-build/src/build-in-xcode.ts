import { basename } from "node:path";
import { closeMainWindow, getPreferenceValues, Toast, showToast } from "@raycast/api";
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

function terminalToastStyle(state: XcodeRunState) {
  switch (state) {
    case "succeeded":
      return Toast.Style.Success;
    case "failed":
    case "cancelled":
    default:
      return Toast.Style.Failure;
  }
}

function completeToast(toast: Toast, title: string, style: Toast.Style, message?: string) {
  toast.style = style;
  toast.title = title;
  toast.message = message;
}

export default async function command() {
  let toast: Toast | undefined;
  let repoName: string | undefined;
  let didStartTrackedRun = false;
  const preferences = getPreferenceValues<Preferences>();

  try {
    const repoRoot = readFocusedRepoRoot();
    repoName = basename(repoRoot);

    toast = await showToast({
      style: Toast.Style.Animated,
      title: buildingTitle(repoName),
    });

    await closeMainWindow({ clearRootSearch: true });

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
      completeToast(toast, untrackedBuildTitle(repoName), Toast.Style.Success, workspaceLabel(target.targetPath));
      return;
    }

    didStartTrackedRun = true;
    const result = observeWorkspaceRunSession(session);

    const terminalState = result.state === "building" ? "unknown" : result.state;
    completeToast(
      toast,
      terminalTitle(repoName, terminalState),
      terminalToastStyle(terminalState),
      workspaceLabel(target.targetPath),
    );
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
      completeToast(toast, terminalTitle(repoName, "unknown"), Toast.Style.Failure);
      return;
    }

    await showFailureToast(error, {
      title: "Couldn't start the Xcode run",
    });
  }
}
