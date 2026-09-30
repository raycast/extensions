// Copied from raycast-window-switcher src/switch-action.ts on 2026-09-30, unchanged except this header, import paths, and an
// optional onFocused callback run before Raycast closes so the caller can record recency (SPEC.md §8.2 switchedAt)
// What Return on a window does (SPEC.md §5.4; order confirmed in Milestone 3, see VERIFICATION.md).
// Focus first, then close Raycast: closing first unloads the command before the helper call finishes.
import { closeMainWindow, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { focusWindow, quitApp } from "./window-helper.ts";
import type { WindowView } from "./lib/window/model.ts";
import { failureText } from "./lib/window/run-helper.ts";

export async function switchToWindow(
  w: WindowView,
  refresh: () => Promise<void>,
  onFocused?: () => Promise<void>,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Switching…" });
  const result = await focusWindow(w.pid, w.wid, w.bundleId);
  if (!result.ok) {
    const text = failureText(result.failure);
    toast.style = Toast.Style.Failure;
    toast.title = text.title;
    toast.message = text.description;
    return;
  }
  const r = result.value;
  if (!r.ok) {
    toast.style = Toast.Style.Failure;
    if (r.code === "window-gone" || r.code === "pid-mismatch") {
      // Never substitute another window: say so and rescan.
      toast.title = "That window closed";
      toast.message = r.message;
      await refresh();
    } else {
      toast.title = "Could not switch";
      toast.message = r.message ?? r.code;
    }
    return;
  }
  await toast.hide();
  if (r.focused && onFocused) await onFocused();
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  if (!r.focused) await showHUD(`Focus not confirmed for “${w.title}”`);
}

/** Quit App (⌃Q): a normal quit, so apps can still ask to save. The list stays open and rescans. */
export async function quitApplication(
  app: { pid: number; name: string; bundleId?: string },
  refresh: () => Promise<void>,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Quitting ${app.name}…` });
  const result = await quitApp(app.pid, app.bundleId);
  if (!result.ok) {
    const text = failureText(result.failure);
    toast.style = Toast.Style.Failure;
    toast.title = text.title;
    toast.message = text.description;
  } else if (result.value.quit) {
    toast.style = Toast.Style.Success;
    toast.title = `Quit ${app.name}`;
  } else if (result.value.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = `${app.name} is still running`;
    toast.message = "It may be asking to save changes. Switch to it to answer.";
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not quit ${app.name}`;
    toast.message = result.value.message;
  }
  await refresh();
}
