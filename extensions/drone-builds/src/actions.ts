import { Alert, closeMainWindow, confirmAlert, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { cancelBuild, restartBuild } from "./drone";

export interface ActionOpts {
  /** Close the Raycast main window before showing the HUD (for no-view commands). */
  closeWindow?: boolean;
  /** Skip the destructive-action confirmation dialog (only honored by doCancel). */
  skipConfirm?: boolean;
}

export async function doRestart(
  slug: string,
  num: number,
  opts: ActionOpts = {},
): Promise<boolean> {
  try {
    await restartBuild(slug, num);
    if (opts.closeWindow) await closeMainWindow();
    await showHUD(`↻ Restarted ${slug} #${num}`);
    return true;
  } catch (e) {
    await showFailureToast(e as Error, { title: "Restart failed" });
    return false;
  }
}

export async function doCancel(
  slug: string,
  num: number,
  opts: ActionOpts = {},
): Promise<boolean> {
  if (!opts.skipConfirm) {
    const confirmed = await confirmAlert({
      title: `Cancel ${slug} #${num}?`,
      message: "Kill the running build. This cannot be undone.",
      primaryAction: {
        title: "Cancel Build",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return false;
  }
  try {
    await cancelBuild(slug, num);
    if (opts.closeWindow) await closeMainWindow();
    await showHUD(`✗ Cancelled ${slug} #${num}`);
    return true;
  } catch (e) {
    await showFailureToast(e as Error, { title: "Cancel failed" });
    return false;
  }
}
