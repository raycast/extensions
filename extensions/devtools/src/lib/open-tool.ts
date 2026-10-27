import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { isDevToolsInstalled, openLink, toolLink } from "../devtools";

/** Opens one DevTools tool. Each per-tool command calls this with its tool id. */
export async function openTool(toolId: string) {
  if (!(await isDevToolsInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "DevTools is not installed",
      message: "Install DevTools 2.1 or later.",
    });
    return;
  }
  try {
    await openLink(toolLink(toolId));
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open DevTools",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
