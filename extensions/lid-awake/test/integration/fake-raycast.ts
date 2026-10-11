import { vi } from "vitest";

// A stand-in for the Raycast API. LocalStorage is an in-memory Map, and the UI calls are spies that tests read.
// Integration test files mock "@raycast/api" and "@raycast/utils" with these objects.

type StorageHook = (key: string) => void | Promise<void>;

export const raycast = {
  store: new Map<string, string>(),
  prefs: { batteryThreshold: "20", defaultDuration: "60" } as Record<string, string>,
  launchCommand: vi.fn(),
  showHUD: vi.fn(),
  showFailureToast: vi.fn(),
  // Run right after a write or removal. They stand in for another Raycast command acting at an exact point, since
  // that command runs in its own process and cannot be interleaved from here.
  afterSetItem: undefined as StorageHook | undefined,
  afterRemoveItem: undefined as StorageHook | undefined,
};

export const raycastApi = {
  getPreferenceValues: () => raycast.prefs,
  launchCommand: raycast.launchCommand,
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  showHUD: raycast.showHUD,
  LocalStorage: {
    getItem: async (key: string) => raycast.store.get(key),
    allItems: async () => Object.fromEntries(raycast.store),
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

export const raycastUtils = {
  showFailureToast: raycast.showFailureToast,
};

// Restores the defaults a fresh extension install would have, and clears every spy.
export function resetRaycast(): void {
  raycast.store.clear();
  raycast.prefs.batteryThreshold = "20";
  raycast.prefs.defaultDuration = "60";
  raycast.afterSetItem = undefined;
  raycast.afterRemoveItem = undefined;
  raycast.launchCommand.mockReset();
  raycast.launchCommand.mockResolvedValue(undefined);
  raycast.showHUD.mockReset();
  raycast.showHUD.mockResolvedValue(undefined);
  raycast.showFailureToast.mockReset();
  raycast.showFailureToast.mockResolvedValue(undefined);
}
