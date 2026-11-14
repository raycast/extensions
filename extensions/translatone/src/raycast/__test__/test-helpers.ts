import { mock } from "bun:test";
import type { Toast } from "@raycast/api";

const NO_SELECTION = new Error("Unable to get selected text from frontmost application");

class RaycastFake {
  preferences: Record<string, unknown> = {};
  selectedText: string | Error = NO_SELECTION;
  launchError: unknown = undefined;
  readonly storage = new Map<string, string>();
  readonly toasts: Toast.Options[] = [];
  readonly clipboard: string[] = [];
  readonly events: string[] = [];
  readonly huds: { readonly title: string; readonly popToRootType: unknown }[] = [];
  readonly openExtensionPreferences = mock(() => Promise.resolve());

  reset(): void {
    this.preferences = {};
    this.selectedText = NO_SELECTION;
    this.launchError = undefined;
    this.storage.clear();
    this.toasts.length = 0;
    this.clipboard.length = 0;
    this.events.length = 0;
    this.huds.length = 0;
    this.openExtensionPreferences.mockClear();
  }
}

export const raycast = new RaycastFake();

void mock.module("@raycast/api", () => ({
  getPreferenceValues: () => raycast.preferences,
  openExtensionPreferences: () => raycast.openExtensionPreferences(),
  getSelectedText: () =>
    raycast.selectedText instanceof Error
      ? Promise.reject(raycast.selectedText)
      : Promise.resolve(raycast.selectedText),
  LocalStorage: {
    getItem: (key: string) => Promise.resolve(raycast.storage.get(key)),
    setItem: (key: string, value: string) => {
      raycast.storage.set(key, value);
      return Promise.resolve();
    },
  },
  Clipboard: {
    copy: (content: string) => {
      raycast.clipboard.push(content);
      return Promise.resolve();
    },
    readText: () => Promise.resolve(raycast.clipboard.at(-1)),
    paste: (content: string) => {
      raycast.events.push(`paste:${content}`);
      return Promise.resolve();
    },
  },
  closeMainWindow: () => {
    raycast.events.push("closeMainWindow");
    return Promise.resolve();
  },
  PopToRootType: { Default: "default", Immediate: "immediate", Suspended: "suspended" },
  LaunchType: { UserInitiated: "userInitiated", Background: "background" },
  launchCommand: (options: { name: string; type: string }) => {
    raycast.events.push(`launch:${options.name}:${options.type}`);
    if (raycast.launchError !== undefined) {
      return Promise.reject(raycast.launchError);
    }
    return Promise.resolve();
  },
  showHUD: (title: string, options?: { popToRootType?: unknown }) => {
    raycast.events.push(`hud:${title}`);
    raycast.huds.push({ title, popToRootType: options?.popToRootType });
    return Promise.resolve();
  },
  Toast: { Style: { Animated: "ANIMATED", Success: "SUCCESS", Failure: "FAILURE" } },
  showToast: (options: Toast.Options) => {
    raycast.events.push(`toast:${options.title}`);
    raycast.toasts.push(options);
    return Promise.resolve();
  },
}));
