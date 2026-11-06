import React from "react";
import { vi } from "vitest";

export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  allItems: vi.fn(),
};

export const Clipboard = {
  copy: vi.fn(),
  readText: vi.fn(),
};

export const showToast = vi.fn();
export const closeMainWindow = vi.fn();
export const popToRoot = vi.fn();
export const open = vi.fn();
export const getPreferenceValues = vi.fn(() => ({
  rememberSearchHistory: true,
  useClipboardFallback: false,
}));

export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
    Animated: "animated",
  },
};

export const Icon = {
  Stars: "stars",
  ArrowRight: "arrow-right",
  Clock: "clock",
  Link: "link",
  MagnifyingGlass: "magnifying-glass",
  Trash: "trash",
  ExclamationMark: "exclamation-mark",
};

export const Keyboard = {
  Shortcut: {
    Common: {
      Copy: { modifiers: ["cmd"], key: "c" },
      Remove: { modifiers: ["ctrl"], key: "x" },
      RemoveAll: { modifiers: ["ctrl", "shift"], key: "x" },
    },
  },
};

export const Action = Object.assign(
  function Action(props: Record<string, unknown>) {
    return React.createElement("action", props);
  },
  {
    Style: {
      Destructive: "destructive",
      Regular: "regular",
    },
    CopyToClipboard: function CopyToClipboard(props: Record<string, unknown>) {
      return React.createElement("copy-to-clipboard", props);
    },
  },
);

export const ActionPanel = Object.assign(
  function ActionPanel(props: Record<string, unknown>) {
    return React.createElement("action-panel", props);
  },
  {
    Section: function ActionPanelSection(props: Record<string, unknown>) {
      return React.createElement("action-panel-section", props);
    },
  },
);

export const List = Object.assign(
  function List(props: Record<string, unknown>) {
    return React.createElement("list", props);
  },
  {
    Section: function ListSection(props: Record<string, unknown>) {
      return React.createElement("list-section", props);
    },
    Item: function ListItem(props: Record<string, unknown>) {
      return React.createElement("list-item", props);
    },
  },
);
