import {
  BrowserExtension,
  closeMainWindow,
  launchCommand,
  LaunchType,
  LocalStorage,
  PopToRootType,
  showHUD,
  type LaunchProps,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  captureBrowserUrl,
  getSavedCaptureWorkspace,
  type BrowserCaptureRequest,
  type CaptureResult,
} from "./capture.js";
import { getActiveBrowserTabs } from "./browser.js";
import { listLearnWorkspaces, runLearn } from "./learn-cli.js";
import { getLearnExecutable } from "./preferences.js";

type CaptureLaunchProps = LaunchProps<{
  launchContext?: { capture?: BrowserCaptureRequest };
}>;

export default async function SaveCurrentBrowserUrl({
  launchContext,
}: CaptureLaunchProps) {
  try {
    const executable = getLearnExecutable();
    let request = launchContext?.capture;
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    if (!request) {
      const [tabs, workspaces] = await Promise.all([
        BrowserExtension.getTabs(),
        listLearnWorkspaces(executable),
      ]);
      const activeTabs = getActiveBrowserTabs({ tabs });
      const savedWorkspace = await getSavedCaptureWorkspace({
        listWorkspaces: async () => workspaces,
        store: LocalStorage,
      });

      if (activeTabs.length > 1 || !savedWorkspace) {
        await launchCommand({
          name: "choose-workspace",
          type: LaunchType.UserInitiated,
          context: {
            capture: { tabs: activeTabs, workspaces, savedWorkspace },
          },
        });
        return;
      }

      request = {
        url: activeTabs[0].url,
        title: activeTabs[0].title,
        workspace: savedWorkspace,
      };
    }

    const result = await captureBrowserUrl({
      ...request,
      runLearn: (args) => runLearn(args, executable),
    });
    await showResult(result, request);
  } catch (error) {
    await showFailureToast(error, { title: "Could not save browser URL" });
  }
}

async function showResult(
  result: CaptureResult,
  request: BrowserCaptureRequest,
): Promise<void> {
  if (result.status === "duplicate") {
    await showFailureToast(
      new Error(`This URL is already in ${request.workspace}`),
      {
        title: "Already saved",
      },
    );
    return;
  }

  await showHUD(
    request.title
      ? `Saved “${request.title}” to ${request.workspace}`
      : `Saved URL to ${request.workspace}`,
  );
}
