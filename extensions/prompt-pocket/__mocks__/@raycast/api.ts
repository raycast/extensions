import { vi } from "vitest";

// LocalStorage mock
export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  allItems: vi.fn(),
  clear: vi.fn(),
};

// Clipboard mock
export const Clipboard = {
  copy: vi.fn(),
  paste: vi.fn(),
  readText: vi.fn(),
  read: vi.fn(),
  clear: vi.fn(),
};

// Toast mock
export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

// showToast mock
export const showToast = vi.fn();

// confirmAlert mock
export const confirmAlert = vi.fn();

// Alert mock
export const Alert = {
  ActionStyle: {
    Default: "default",
    Destructive: "destructive",
    Cancel: "cancel",
  },
};

// Icon mock (簡易版)
export const Icon = {
  Document: "document-icon",
  Plus: "plus-icon",
  Trash: "trash-icon",
  Pencil: "pencil-icon",
  Eye: "eye-icon",
  Clipboard: "clipboard-icon",
  ArrowRight: "arrow-right-icon",
  Check: "check-icon",
  Text: "text-icon",
  Tag: "tag-icon",
  Fingerprint: "fingerprint-icon",
  Calendar: "calendar-icon",
  Clock: "clock-icon",
};

// Color mock
export const Color = {
  Blue: "blue",
  Green: "green",
  Red: "red",
  Orange: "orange",
  Purple: "purple",
};

// その他必要なモック
export const useNavigation = vi.fn(() => ({
  push: vi.fn(),
  pop: vi.fn(),
}));

export const Action = {
  Push: vi.fn(),
  CopyToClipboard: vi.fn(),
  Style: {
    Default: "default",
    Destructive: "destructive",
  },
};

export const ActionPanel = {
  Section: vi.fn(),
};

export const List = {
  Item: vi.fn(),
  EmptyView: vi.fn(),
};

export const Form = {
  TextField: vi.fn(),
  TextArea: vi.fn(),
  Description: vi.fn(),
};

