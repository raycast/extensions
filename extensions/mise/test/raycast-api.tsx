import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

type Props = Record<string, unknown> & { children?: ReactNode };

function host(tag: string) {
  const Component = ({ children, ...props }: Props) => createElement(tag, props, children);
  Component.displayName = tag;
  return Component;
}

export const List = Object.assign(host("list"), {
  Item: Object.assign(host("list-item"), { Detail: host("list-item-detail") }),
  Section: host("list-section"),
  EmptyView: host("list-empty-view"),
  Dropdown: Object.assign(host("list-dropdown"), { Item: host("list-dropdown-item") }),
});

export const Detail = host("detail");

export const ActionPanel = Object.assign(host("action-panel"), {
  Section: host("action-panel-section"),
  Submenu: host("action-panel-submenu"),
});

export const Action = Object.assign(host("action"), {
  Push: host("action-push"),
  Open: host("action-open"),
  OpenInBrowser: host("action-open-in-browser"),
  CopyToClipboard: host("action-copy-to-clipboard"),
  ShowInFinder: host("action-show-in-finder"),
  Style: { Regular: "regular", Destructive: "destructive" },
});

export const MenuBarExtra = Object.assign(host("menu-bar-extra"), {
  Item: host("menu-bar-extra-item"),
  Section: host("menu-bar-extra-section"),
});

export const Icon = new Proxy({} as Record<string, string>, { get: (_, key) => String(key) });
export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } };
export const Alert = { ActionStyle: { Default: "default", Cancel: "cancel", Destructive: "destructive" } };
export const LaunchType = { UserInitiated: "userInitiated", Background: "background" };
export const Keyboard = { Shortcut: { Common: { Refresh: { modifiers: ["cmd"], key: "r" } } } };

// resolveMise reads the login shell's environment from this cache; a fresh record keeps every
// component test from spawning a real shell.
const seededCache = { "locate.env": JSON.stringify({ capturedAt: Date.now(), env: { PATH: "/bin" } }) };

export class Cache {
  private readonly data = new Map(Object.entries(seededCache));
  constructor(readonly options?: { namespace?: string }) {}
  get(key: string): string | undefined {
    return this.data.get(key);
  }
  set(key: string, value: string): void {
    this.data.set(key, value);
  }
}

// The manifest defaults, with misePath pointing at a binary that exists so resolveMise never probes.
export const defaultPreferences: Record<string, unknown> = {
  misePath: "/bin/sh",
  upgradeBump: false,
  includeInactive: false,
  uninstallRemovesConfig: false,
  jobs: "",
  showInactive: true,
  closeAfterAction: false,
  debugLogging: false,
};

export const mocks = {
  getPreferenceValues: vi.fn(() => ({ ...defaultPreferences })),
  openExtensionPreferences: vi.fn(async () => {}),
  showToast: vi.fn(async (options: Record<string, unknown>) => ({ ...options, hide: vi.fn(async () => {}) })),
  showHUD: vi.fn(async () => {}),
  closeMainWindow: vi.fn(async () => {}),
  confirmAlert: vi.fn(async () => false),
  launchCommand: vi.fn(async () => {}),
  updateCommandMetadata: vi.fn(async () => {}),
  copy: vi.fn(async () => {}),
  push: vi.fn(),
  pop: vi.fn(),
};

export const getPreferenceValues = mocks.getPreferenceValues;
export const openExtensionPreferences = mocks.openExtensionPreferences;
export const showToast = mocks.showToast;
export const showHUD = mocks.showHUD;
export const closeMainWindow = mocks.closeMainWindow;
export const confirmAlert = mocks.confirmAlert;
export const launchCommand = mocks.launchCommand;
export const updateCommandMetadata = mocks.updateCommandMetadata;
export const Clipboard = { copy: mocks.copy };
export const useNavigation = () => ({ push: mocks.push, pop: mocks.pop });
