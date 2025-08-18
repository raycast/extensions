import { vi } from "vitest";

<<<<<<< ours
// Log when this mock is loaded
console.log("Loading Raycast API mock...");
||||||| ancestor
export const getPreferenceValues = vi.fn(() => ({
  vaultPath: "/path/to/vault",
  refreshInterval: "24",
}));
=======
// Mock implementation of @raycast/api
export const getPreferenceValues = vi.fn();
export const showToast = vi.fn().mockResolvedValue(undefined);
export const open = vi.fn().mockResolvedValue(undefined);

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};
>>>>>>> theirs

<<<<<<< ours
// Preferences
export const getPreferenceValues = vi.fn(() => {
  console.log("Mock getPreferenceValues called");
  return {
    vaultPath: "/path/to/vault",
    refreshInterval: "24",
  };
});

// System
export const showToast = vi.fn();
export const open = vi.fn();
export const environment = {
  supportPath: "/path/to/support",
||||||| ancestor
// Add other Raycast API mocks as needed
export const showToast = vi.fn();
export const open = vi.fn();
export const environment = {
  supportPath: "/path/to/support",
=======
export const Action = {
  SubmitForm: ({ title, onSubmit }: any) => ({
    title,
    onSubmit,
  }),
>>>>>>> theirs
};
<<<<<<< ours
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

// UI Components
export const ActionPanel = vi.fn(() => null);
export const Action = vi.fn(() => null);
export const List = vi.fn(() => null);
export const Form = vi.fn(() => null);
export const Detail = vi.fn(() => null);
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
};

// Re-export React hooks that Raycast components might use
export const useEffect = vi.fn();
export const useState = vi.fn();
export const useCallback = vi.fn();
export const useMemo = vi.fn();
export const useRef = vi.fn();
||||||| ancestor
=======

export const ActionPanel = ({ children }: any) => ({
  children,
});

export const Form = {
  TextField: ({ id, value, onChange, onBlur, error }: any) => ({
    id,
    value,
    onChange,
    onBlur,
    error,
  }),
  Description: ({ text }: any) => ({
    text,
  }),
};

export const Detail = ({ markdown, isLoading, actions }: any) => ({
  markdown,
  isLoading,
  actions,
});
>>>>>>> theirs
