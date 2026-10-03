import {
  BrowserExtension,
  closeMainWindow,
  getFrontmostApplication,
  launchCommand,
  LaunchType,
  LocalStorage,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api";
import {
  captureBrowserUrl,
  CAPTURE_WORKSPACE_KEY,
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
    const application = request ? undefined : await getFrontmostApplication();
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    if (!request) {
      const [tabs, workspaces] = await Promise.all([
        BrowserExtension.getTabs(),
        listLearnWorkspaces(executable),
      ]);
      const activeTabs = getActiveBrowserTabs({
        applicationName: application?.name,
        tabs,
      });
      if (workspaces.length === 0) {
        throw new Error(
          "No Learn workspace found. Create one with: learn new <name>",
        );
      }
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
    await LocalStorage.setItem(CAPTURE_WORKSPACE_KEY, request.workspace);
    await showResult(result, request);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not save browser URL",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function showResult(
  result: CaptureResult,
  request: BrowserCaptureRequest,
): Promise<void> {
  if (result.status === "duplicate") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Already saved",
      message: `This URL is already in ${request.workspace}`,
    });
    return;
  }

  await showHUD(
    request.title
      ? `Saved “${request.title}” to ${request.workspace}`
      : `Saved URL to ${request.workspace}`,
  );
}
