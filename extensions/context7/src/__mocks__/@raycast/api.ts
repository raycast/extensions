/**
 * Mock implementation of @raycast/api for testing
 */

// Mock environment
export const environment = {
  isDevelopment: false,
  commandName: "test-command",
  extensionName: "test-extension",
};

// Mock getPreferenceValues
export function getPreferenceValues<T>(): T {
  return {
    apiKey: undefined,
    defaultTokens: "10000",
  } as T;
}

// Mock other commonly used exports (add as needed)
export const showToast = () => Promise.resolve();
export const openExtensionPreferences = () => Promise.resolve();

// Mock Icon enum
export const Icon = {
  MagnifyingGlass: "magnifying-glass",
  ExclamationMark: "exclamation-mark",
  QuestionMark: "question-mark",
  Book: "book",
  Star: "star",
  CheckCircle: "check-circle",
  Code: "code",
  Gear: "gear",
  Link: "link",
  Clipboard: "clipboard",
};

// Mock Color enum
export const Color = {
  SecondaryText: "secondary-text",
  Green: "green",
  Blue: "blue",
  Yellow: "yellow",
};

// Mock Toast
export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};

// Mock Clipboard
export const Clipboard = {
  copy: () => Promise.resolve(),
};

// Mock other components (empty implementations for now)
export const List = {};
export const Detail = {};
export const Action = {};
export const ActionPanel = {};
