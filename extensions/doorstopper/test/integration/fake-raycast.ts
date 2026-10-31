import { vi } from "vitest";

// A stand-in for the Raycast API. LocalStorage is an in-memory Map, and the UI calls are spies that tests read.
// Integration test files mock "@raycast/api" and "@raycast/utils" with these objects.

type StorageHook = (key: string) => void | Promise<void>;

export const raycast = {
  store: new Map<string, string>(),
  prefs: { batteryThreshold: "20", defaultDuration: "0" } as Record<string, string>,
  launchCommand: vi.fn(),
  showHUD: vi.fn(),
  showFailureToast: vi.fn(),
  showToast: vi.fn(),
  updateCommandMetadata: vi.fn(),
  // Run right after a write or removal. They stand in for another Raycast command acting at an exact point, since
  // that command runs in its own process and cannot be interleaved from here.
  afterSetItem: undefined as StorageHook | undefined,
  afterRemoveItem: undefined as StorageHook | undefined,
  // Makes allItems reads fail. The first `skip` reads succeed, then the next `fail` reads reject with "storage
  // unavailable". A hook sets these so the read it needs, and only that one, fails.
  storageFaults: { skip: 0, fail: 0 },
};

export const raycastApi = {
  getPreferenceValues: () => raycast.prefs,
  launchCommand: raycast.launchCommand,
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  showHUD: raycast.showHUD,
  showToast: raycast.showToast,
  updateCommandMetadata: raycast.updateCommandMetadata,
  Toast: { Style: { Success: "success", Failure: "failure", Animated: "animated" } },
  LocalStorage: {
    getItem: async (key: string) => raycast.store.get(key),
    allItems: async () => {
      if (raycast.storageFaults.skip > 0) {
        raycast.storageFaults.skip -= 1;
      } else if (raycast.storageFaults.fail > 0) {
        raycast.storageFaults.fail -= 1;
        throw new Error("storage unavailable");
      }
      return Object.fromEntries(raycast.store);
    },
    setItem: async (key: string, value: string) => {
      raycast.store.set(key, value);
      await raycast.afterSetItem?.(key);
    },
    removeItem: async (key: string) => {
      raycast.store.delete(key);
      await raycast.afterRemoveItem?.(key);
    },
  },
};

type AppleScriptRunner = (script: string, args: string[]) => Promise<string>;
let appleScriptRunner: AppleScriptRunner = async () => {
  throw new Error("No fake Mac installed to run AppleScript");
};

// The fake Mac answers runAppleScript, since the admin password prompt is part of macOS, not Raycast.
export function setAppleScriptRunner(runner: AppleScriptRunner): void {
  appleScriptRunner = runner;
}

export const raycastUtils = {
  showFailureToast: raycast.showFailureToast,
  runAppleScript: (script: string, args: string[] = []) => appleScriptRunner(script, args),
};

// Restores the defaults a fresh extension install would have, and clears every spy.
export function resetRaycast(): void {
  raycast.store.clear();
  raycast.prefs.batteryThreshold = "20";
  raycast.prefs.defaultDuration = "0";
  raycast.afterSetItem = undefined;
  raycast.afterRemoveItem = undefined;
  raycast.storageFaults = { skip: 0, fail: 0 };
  raycast.launchCommand.mockReset();
  raycast.launchCommand.mockResolvedValue(undefined);
  raycast.showHUD.mockReset();
  raycast.showHUD.mockResolvedValue(undefined);
  raycast.showFailureToast.mockReset();
  raycast.showFailureToast.mockResolvedValue(undefined);
  raycast.showToast.mockReset();
  raycast.showToast.mockResolvedValue(undefined);
  raycast.updateCommandMetadata.mockReset();
  raycast.updateCommandMetadata.mockResolvedValue(undefined);
}
