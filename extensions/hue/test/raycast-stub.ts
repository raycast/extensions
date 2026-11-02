// Stands in for @raycast/api, which only runs inside Raycast. vitest.config.mts aliases it, for @raycast/utils too.
import { vi } from "vitest";

export enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

const component = <T extends object>(statics: T) => Object.assign(() => null, statics);

export const Action = component({
  Style: { Regular: "regular", Destructive: "destructive" },
  Push: () => null,
});
export const ActionPanel = component({ Section: () => null, Submenu: () => null });
export const Detail = component({});
export const Grid = component({
  Item: () => null,
  Section: () => null,
  Fit: { Contain: "contain", Fill: "fill" },
});

export const Alert = { ActionStyle: { Default: "default", Cancel: "cancel", Destructive: "destructive" } };
export const Image = { Mask: { Circle: "circle", RoundedRectangle: "roundedRectangle" } };
export const Toast = { Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" } };

// Every icon is its name.
export const Icon: Record<string, string> = new Proxy(
  {},
  { get: (_, name) => (typeof name === "string" ? name : undefined) },
);

export const environment = {
  assetsPath: "",
  supportPath: "",
  launchType: LaunchType.UserInitiated as LaunchType,
  appearance: "dark" as "dark" | "light",
  commandName: "test",
  extensionName: "hue",
  isDevelopment: true,
  raycastVersion: "2.0.0",
};

const defaultPreferences: Preferences = { toggleAllLights: "off", bridgeIpAddress: "", bridgeUsername: "" };
export const preferences: Preferences = { ...defaultPreferences };
export const getPreferenceValues = () => preferences;

export const storage = new Map<string, string>();
export const LocalStorage = {
  getItem: async <T>(key: string) => storage.get(key) as T | undefined,
  setItem: async (key: string, value: string) => void storage.set(key, value),
  removeItem: async (key: string) => void storage.delete(key),
  allItems: async () => Object.fromEntries(storage),
  clear: async () => storage.clear(),
};

// Caches with the same namespace share their entries. Each call looks its namespace up, so resetRaycast reaches caches
// that modules created when they loaded.
export const caches = new Map<string, Map<string, string>>();
export class Cache {
  private readonly namespace: string;
  constructor(options?: { namespace?: string }) {
    this.namespace = options?.namespace ?? "";
  }
  private get entries() {
    if (!caches.has(this.namespace)) caches.set(this.namespace, new Map());
    return caches.get(this.namespace)!;
  }
  get = (key: string) => this.entries.get(key);
  set = (key: string, data: string) => void this.entries.set(key, data);
  has = (key: string) => this.entries.has(key);
  remove = (key: string) => this.entries.delete(key);
  clear = () => this.entries.clear();
  subscribe = () => () => {};
  get isEmpty() {
    return this.entries.size === 0;
  }
}

type ToastOptions = { style?: string; title: string; message?: string };
export type ToastEvent = { event: "show" | "hide" } & ToastOptions;
// Every toast shown and hidden, in order.
export const toasts: ToastEvent[] = [];
export const showToast = vi.fn(async (options: ToastOptions) => {
  toasts.push({ event: "show", ...options });
  return {
    ...options,
    hide: async () => void toasts.push({ event: "hide", ...options }),
    show: async () => void toasts.push({ event: "show", ...options }),
  };
});

export const showHUD = vi.fn(async () => {});
export const confirmAlert = vi.fn(async () => true);
export const openExtensionPreferences = vi.fn(async () => {});
export const updateCommandMetadata = vi.fn(async () => {});
export const useNavigation = () => ({ push: () => {}, pop: () => {} });

export function resetRaycast() {
  Object.assign(preferences, defaultPreferences);
  environment.launchType = LaunchType.UserInitiated;
  environment.appearance = "dark";
  storage.clear();
  caches.clear();
  toasts.length = 0;
}
