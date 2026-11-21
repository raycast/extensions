import { Action, Icon, Keyboard, PopToRootType, Toast, closeMainWindow, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { RemoveWindow } from "./app-windows";
import { activateApplication, focusNativeWindow } from "./window-focus";
import { raiseAXWindow, type AppGroup, type AXWindow, type Window } from "./windows";

export interface WindowActions {
  refresh: () => void;
  activateApp: (app: AppGroup) => Promise<void>;
  focusWindow: (window: Window, onRemoved?: RemoveWindow) => Promise<void>;
  focusAXWindow: (window: AXWindow) => Promise<void>;
}

export function RefreshWindowsAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action title="Refresh List" icon={Icon.Repeat} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={onRefresh} />
  );
}

export function createWindowActions(removeWindow: (window: Window) => void, refresh: () => void): WindowActions {
  async function handleMissingWindow(target: Window, onRemoved?: RemoveWindow): Promise<void> {
    removeWindow(target);
    onRemoved?.(target.id);
    refresh();
    await showToast({
      style: Toast.Style.Failure,
      title: "Window no longer exists",
      message: "The window list is being refreshed.",
    });
  }

  async function focusWindow(target: Window, onRemoved?: RemoveWindow): Promise<void> {
    try {
      if ((await focusNativeWindow(target)) === "missing") {
        await handleMissingWindow(target, onRemoved);
        return;
      }
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to focus window" });
    }
  }

  async function focusAXWindow(target: AXWindow): Promise<void> {
    try {
      await raiseAXWindow(target);
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to focus window" });
      refresh();
    }
  }

  async function activateApp(app: AppGroup): Promise<void> {
    try {
      const result = await activateApplication(app);
      if (result === "focused") {
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
        return;
      }
      if (result === "multiple") {
        refresh();
        await showToast({
          style: Toast.Style.Failure,
          title: "Multiple accessible windows found",
          message: "The list has changed. Refresh and choose a window.",
        });
        return;
      }
      if (app.windows[0]) {
        await handleMissingWindow(app.windows[0]);
        return;
      }
      refresh();
      await showToast({ style: Toast.Style.Failure, title: "Application is no longer running" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to open application window" });
    }
  }

  return { refresh, activateApp, focusWindow, focusAXWindow };
}
