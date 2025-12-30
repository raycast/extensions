// Mock for @raycast/api used in tests
export const environment = {
  assetsPath: "/mock/assets/path",
  supportPath: "/mock/support/path",
  extensionName: "better-contacts",
  commandName: "search-contacts",
  commandMode: "view",
  isDevelopment: true,
  appearance: "light",
  textSize: "medium",
  launchType: "userInitiated",
  launchContext: undefined,
};

export const Icon = {
  Person: "person",
  Phone: "phone",
  Envelope: "envelope",
  Clipboard: "clipboard",
};

export const Clipboard = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  copy: async (text: string) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  paste: async (text: string) => {},
  read: async () => ({ text: "" }),
  clear: async () => {},
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const open = async (url: string) => {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const showToast = async (options: unknown) => {};

export const Action = {};
export const ActionPanel = {};
export const List = {};
export const Detail = {};
export const Form = {};
