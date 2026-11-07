// Copied from raycast-window-switcher src/switch-action.ts on 2026-09-30, unchanged except this header, import paths, and an
// optional onFocused callback run before Raycast closes so the caller can record recency (SPEC.md §8.2 switchedAt),
// plus closeAppWindow (owner, 2026-10-08)
// What Return on a window does (SPEC.md §5.4; order confirmed in Milestone 3, see VERIFICATION.md).
// Focus first, then close Raycast: closing first unloads the command before the helper call finishes.
import { closeMainWindow, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { activateApp } from "./running.ts";
import { closeWindow, focusWindow, quitApp } from "./window-helper.ts";
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

/**
 * Quit App (⌃Q): a normal quit, so apps can still ask to save. The list stays open and rescans, except when the app is
 * still running afterwards (a save prompt): then the app comes to the front and Raycast closes, so the prompt is not
 * hidden behind the list (owner, 2026-10-08). Returns "asking" in that case.
 */
export async function quitApplication(
  app: { pid: number; name: string; bundleId?: string },
  refresh: () => Promise<void>,
): Promise<"asking" | undefined> {
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
    if (app.bundleId && (await activateApp(app.bundleId))) {
      await toast.hide();
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await showHUD(`${app.name} is asking before it quits`);
      return "asking";
    }
    toast.style = Toast.Style.Failure;
    toast.title = `${app.name} is still running`;
    toast.message = "It may be asking to save changes. Switch to it to answer.";
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not quit ${app.name}`;
    toast.message = result.value.message;
  }
  await refresh();
  return undefined;
}

/** How Close Window ended: `asking` means Raycast handed the screen to the app's save prompt and closed itself. */
export type CloseOutcome = "closed" | "asking" | "failed";

/**
 * Close Window (⌃Q on a window row of a multi-window app): presses that window's close button, so the app keeps its
 * other windows and can still ask to save. Never closes a substitute window. When the window stays open (a save
 * prompt, observed with Word), it is brought to the front and Raycast closes, so the prompt is not hidden behind the
 * list (owner, 2026-10-08); otherwise the list stays open and rescans.
 */
export async function closeAppWindow(
  w: { pid: number; wid: number; name: string; bundleId?: string },
  refresh: () => Promise<void>,
  onClosed?: () => void,
): Promise<CloseOutcome> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Closing ${w.name} window…` });
  const result = await closeWindow(w.pid, w.wid, w.bundleId);
  if (!result.ok) {
    const text = failureText(result.failure);
    toast.style = Toast.Style.Failure;
    toast.title = text.title;
    toast.message = text.description;
  } else if (result.value.closed) {
    toast.style = Toast.Style.Success;
    toast.title = `Closed ${w.name} window`;
    onClosed?.();
  } else if (result.value.ok) {
    // Still open: almost always the app asking to save. Show its prompt; never close or quit anything else.
    const focus = await focusWindow(w.pid, w.wid, w.bundleId);
    if (focus.ok && focus.value.ok) {
      await toast.hide();
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await showHUD(`${w.name} is asking before it closes the window`);
      return "asking";
    }
    toast.style = Toast.Style.Failure;
    toast.title = `${w.name} window is still open`;
    toast.message = "It may be asking to save changes. Switch to it to answer.";
  } else if (result.value.code === "window-gone" || result.value.code === "pid-mismatch") {
    toast.style = Toast.Style.Failure;
    toast.title = "That window closed";
    toast.message = result.value.message;
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not close ${w.name} window`;
    toast.message = result.value.message ?? result.value.code;
  }
  await refresh();
  return result.ok && result.value.closed ? "closed" : "failed";
}
