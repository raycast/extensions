import { vi } from "vitest";

export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  allItems: vi.fn(),
  clear: vi.fn(),
};

export const Clipboard = {
  readText: vi.fn(),
  copy: vi.fn(),
  paste: vi.fn(),
  clear: vi.fn(),
};

export const showToast = vi.fn();
export const showHUD = vi.fn();
export const getPreferenceValues = vi.fn();
export const openExtensionPreferences = vi.fn();
export const confirmAlert = vi.fn();

export const Toast = {
  Style: {
    Animated: "animated",
    Success: "success",
    Failure: "failure",
  },
};

export const Alert = {
  ActionStyle: {
    Destructive: "destructive",
  },
};

export const Icon = {
  Link: "link",
  Trash: "trash",
  Gear: "gear",
};

export const Color = {
  SecondaryText: "secondary",
};

export const Action = {
  Style: {
    Destructive: "destructive",
  },
  CopyToClipboard: vi.fn(),
  OpenInBrowser: vi.fn(),
};

export const List = vi.fn();
export const ActionPanel = vi.fn();
