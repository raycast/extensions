import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { jumpTo } from "./terminal";
import { cleanName, movePane, PaneRef } from "./tuios";

export async function fail(title: string, e: unknown) {
  await showFailureToast(e, { title });
}

/** Focus the pane, bring its terminal forward and close Raycast. */
export async function jump(p: PaneRef) {
  try {
    await jumpTo(p);
    await closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    await fail("Could not jump", e);
  }
}

/** Move the pane to another session; the toast offers a jump to it. */
export async function move(p: PaneRef & { name: string }, to: string, refresh: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Moving to ${to}…` });
  try {
    await movePane(p, to);
    toast.style = Toast.Style.Success;
    toast.title = `Moved ${cleanName(p.name)} → ${to}`;
    toast.primaryAction = { title: "Jump to It", onAction: () => jump({ ...p, session: to }) };
    refresh();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not move the pane";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
