// Mock implementation of @raycast/api for testing
// This provides the minimal interface needed for tests to run

export const environment = {
  supportPath: "/tmp/raycast-test-support",
  assetsPath: "/tmp/raycast-test-assets",
  raycastVersion: "1.0.0",
  commandName: "test-command",
  commandMode: "view",
  launchType: "userInitiated",
  launchContext: {},
  appearance: "light" as const,
  canAccess: () => true,
};

// Mock other commonly used exports
export const showToast = () => {};
export const Toast = {
  Style: {
    Animated: "animated",
    Failure: "failure",
    Success: "success",
  },
};

// Mock preference functions
export const getPreferenceValues = () => ({});

// Mock React components that are commonly used
export const List = ({ children }: { children: React.ReactNode }) => children;
export const ActionPanel = ({ children }: { children: React.ReactNode }) => children;
export const Action = ({ children }: { children: React.ReactNode }) => children;
export const Icon = ({ name }: { name: string }) => null;

// Add other commonly used exports as needed
export default {
  environment,
  showToast,
  Toast,
  getPreferenceValues,
  List,
  ActionPanel,
  Action,
  Icon,
};
