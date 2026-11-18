import { readPlistValue, setPlistValue } from "./plist";

export interface ConfigToggle {
  key: string;
  displayName: string;
  enabledMessage: string;
  disabledMessage: string;
}

export const CONFIG_TOGGLES = {
  buttons: {
    key: "General:buttonKillSwitch",
    displayName: "Button Remapping",
    enabledMessage: "Button remapping enabled",
    disabledMessage: "Button remapping disabled",
  },
  scroll: {
    key: "General:scrollKillSwitch",
    displayName: "Scroll Modifications",
    enabledMessage: "Scroll modifications enabled",
    disabledMessage: "Scroll modifications disabled",
  },
  menuBarItem: {
    key: "General:showMenuBarItem",
    displayName: "Menu Bar Item",
    enabledMessage: "Menu bar item shown",
    disabledMessage: "Menu bar item hidden",
  },
  prereleases: {
    key: "General:checkForPrereleases",
    displayName: "Check for Prereleases",
    enabledMessage: "Prerelease updates enabled",
    disabledMessage: "Prerelease updates disabled",
  },
  updates: {
    key: "General:checkForUpdates",
    displayName: "Check for Updates",
    enabledMessage: "Update checking enabled",
    disabledMessage: "Update checking disabled",
  },
  lockPointer: {
    key: "General:lockPointerDuringDrag",
    displayName: "Lock Pointer During Drag",
    enabledMessage: "Lock pointer enabled",
    disabledMessage: "Lock pointer disabled",
  },
  reverseScroll: {
    key: "Scroll:reverseDirection",
    displayName: "Reverse Scroll Direction",
    enabledMessage: "Reverse scroll direction enabled",
    disabledMessage: "Reverse scroll direction disabled",
  },
  trackpadSimulation: {
    key: "Scroll:trackpadSimulation",
    displayName: "Trackpad Simulation",
    enabledMessage: "Trackpad simulation enabled",
    disabledMessage: "Trackpad simulation disabled",
  },
  preciseScroll: {
    key: "Scroll:precise",
    displayName: "Precise Scrolling",
    enabledMessage: "Precise scrolling enabled",
    disabledMessage: "Precise scrolling disabled",
  },
  systemAcceleration: {
    key: "Pointer:useSystemAcceleration",
    displayName: "System Pointer Acceleration",
    enabledMessage: "System pointer acceleration enabled",
    disabledMessage: "System pointer acceleration disabled",
  },
} as const;

// Scroll smoothness levels
export type ScrollSmoothness = "off" | "regular" | "high";

export const SCROLL_SMOOTHNESS_LEVELS: ScrollSmoothness[] = ["off", "regular", "high"];

export const SCROLL_SMOOTHNESS_KEY = "Scroll:smooth";

// Scroll speed levels
export type ScrollSpeed = "system" | "low" | "medium" | "high";

export const SCROLL_SPEED_LEVELS: ScrollSpeed[] = ["system", "low", "medium", "high"];

export const SCROLL_SPEED_KEY = "Scroll:speed";

export function toggleConfigValue(key: string): { newValue: string; newState: "enabled" | "disabled" } {
  const current = readPlistValue(key);
  const newValue = current === "true" ? "false" : "true";
  const newState = current === "true" ? "enabled" : "disabled";

  setPlistValue(key, newValue);

  return { newValue, newState };
}

export function setConfigValue(key: string, value: string): void {
  setPlistValue(key, value);
}

export function getConfigValue(key: string): string {
  return readPlistValue(key);
}

export function cycleConfigValue<T extends string>(key: string, values: readonly T[]): T {
  const current = readPlistValue(key) as T;
  const currentIndex = values.indexOf(current);
  const nextIndex = (currentIndex + 1) % values.length;
  const nextValue = values[nextIndex];

  setPlistValue(key, nextValue);

  return nextValue;
}
