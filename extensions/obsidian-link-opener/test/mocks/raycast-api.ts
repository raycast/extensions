import { vi } from "vitest";

// Mock implementation of @raycast/api
export const getPreferenceValues = vi.fn(() => ({
  vaultPath: "/path/to/vault",
  refreshInterval: "24",
  useFrecency: true,
}));

export const showToast = vi.fn().mockResolvedValue(undefined);
export const open = vi.fn().mockResolvedValue(undefined);

export const environment = {
  supportPath: "/path/to/support",
};

export const getApplications = vi.fn();
export const getSelectedText = vi.fn();
export const showHUD = vi.fn();
export const closeMainWindow = vi.fn();
export const popToRoot = vi.fn();

export const Clipboard = {
  copy: vi.fn(),
  read: vi.fn(),
  clear: vi.fn(),
};

// LocalStorage mock
export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  allItems: vi.fn(),
};

// UI Components
export const ActionPanel = vi.fn(({ children }) => children);
ActionPanel.Section = vi.fn(({ children }) => children);

export const Action = {
  OpenInBrowser: vi.fn(() => null),
  CopyToClipboard: vi.fn(() => null),
  SubmitForm: vi.fn(({ title, onSubmit }) => ({
    title,
    onSubmit,
  })),
};

export const List = vi.fn(({ children }) => children);
List.Item = vi.fn(() => null);
List.EmptyView = vi.fn(() => null);

export const Form = {
  TextField: vi.fn(({ id, value, onChange, onBlur, error }) => ({
    id,
    value,
    onChange,
    onBlur,
    error,
  })),
  Description: vi.fn(({ text }) => ({
    text,
  })),
};

export const Detail = vi.fn(({ markdown, isLoading, actions }) => ({
  markdown,
  isLoading,
  actions,
}));

export const Grid = vi.fn(() => null);
export const MenuBarExtra = vi.fn(() => null);

export const Keyboard = {
  Shortcut: vi.fn(() => null),
};

// Constants & Enums
export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
    Animated: "animated",
  },
};

export const Icon = {
  Globe: "globe",
  Desktop: "desktop",
  Terminal: "terminal",
  Text: "text",
  Document: "document",
  WebPage: "web-page",
  Link: "link",
  List: "list",
  Star: "star",
  Info: "info",
  Warning: "warning",
  Error: "error",
  House: "house",
  Window: "window",
  Compass: "compass",
  Megaphone: "megaphone",
  Code: "code",
  SpeechBubble: "speech-bubble",
  Video: "video",
  QuestionMark: "question-mark",
  Book: "book",
  Pencil: "pencil",
  Cart: "cart",
  Folder: "folder",
  ArrowClockwise: "arrow-clockwise",
};

// Launch functionality
export const launchCommand = vi.fn();
export const LaunchType = {
  UserInitiated: "user-initiated",
  Background: "background",
};

// React hooks (re-exported for convenience)
export const useEffect = vi.fn();
export const useState = vi.fn();
export const useCallback = vi.fn();
export const useMemo = vi.fn();
export const useRef = vi.fn();