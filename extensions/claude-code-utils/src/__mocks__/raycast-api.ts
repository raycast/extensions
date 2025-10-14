export const showToast = jest.fn();
export const showHUD = jest.fn();
export const closeMainWindow = jest.fn();
export const popToRoot = jest.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const Icon = {
  Clipboard: "clipboard",
  Eye: "eye",
  Document: "document",
  ArrowClockwise: "arrow-clockwise",
  Trash: "trash",
  Plus: "plus",
  CopyClipboard: "copy-clipboard",
  ExclamationMark: "exclamation-mark",
  Lock: "lock",
  MagnifyingGlass: "magnifying-glass",
  Stars: "stars",
};

export const Color = {
  Red: "red",
  Orange: "orange",
  Yellow: "yellow",
  Green: "green",
  Blue: "blue",
};

export const Alert = {
  ActionStyle: {
    Default: "default",
    Cancel: "cancel",
    Destructive: "destructive",
  },
};

export const confirmAlert = jest.fn();

export const Clipboard = {
  copy: jest.fn(),
};

export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

export const environment = {
  canAccess: jest.fn(() => true),
  isDevelopment: false,
};

export const AI = {
  ask: jest.fn(),
  Model: {
    Anthropic_Claude_Haiku: "anthropic-claude-haiku",
  },
};

// Mock React components
export const Action = Object.assign(() => null, {
  Push: () => null,
  SubmitForm: () => null,
});

export const ActionPanel = () => null;
export const Detail = Object.assign(() => null, {
  Metadata: Object.assign(() => null, {
    Label: () => null,
    Separator: () => null,
  }),
});

export const Form = Object.assign(() => null, {
  TextField: () => null,
  TextArea: () => null,
});

export const List = Object.assign(() => null, {
  EmptyView: () => null,
  Item: () => null,
  Dropdown: Object.assign(() => null, {
    Item: () => null,
  }),
});
