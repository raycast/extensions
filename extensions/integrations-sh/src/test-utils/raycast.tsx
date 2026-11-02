import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

// Render Raycast UI as inert host nodes; the real utils hooks remain under test.
const component = (name: string) => (props: { children?: ReactNode }) => createElement(name, props);
export const Action = Object.assign(component("Action"), {
  CopyToClipboard: component("CopyToClipboard"),
  OpenInBrowser: component("OpenInBrowser"),
  Push: component("Push"),
});
export const ActionPanel = Object.assign(component("ActionPanel"), {
  Section: component("Section"),
  Submenu: component("Submenu"),
});
export const List = Object.assign(component("List"), {
  Item: component("Item"),
  EmptyView: component("EmptyView"),
  Dropdown: Object.assign(component("Dropdown"), { Item: component("DropdownItem"), Section: component("Section") }),
});
export const Detail = component("Detail");
export const Icon = {};
export const Image = { Mask: {} };
export const Keyboard = { Shortcut: { Common: {} } };
export const environment = { commandName: "search-integrations", extensionName: "integrations-sh" };
export const LaunchType = {};
export const Toast = { Style: { Failure: "failure" } };
export const showToast = vi.fn();
export const Clipboard = {};
export const open = vi.fn();
export const MenuBarExtra = {};
export const AI = {};
export const LocalStorage = {};
export const Color = {};
export const OAuth = {};

export class Cache {
  static instances: Cache[] = [];
  data = new Map<string, string>();
  listeners = new Set<() => void>();
  constructor() {
    Cache.instances.push(this);
  }
  get = (key: string) => this.data.get(key);
  set = (key: string, value: string) => {
    this.data.set(key, value);
    this.listeners.forEach((listener) => listener());
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
