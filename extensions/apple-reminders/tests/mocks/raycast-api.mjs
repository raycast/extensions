export const Color = {
  Red: "red",
  Yellow: "yellow",
  Blue: "blue",
};

export const Icon = {
  Exclamationmark: "exclamation",
  Exclamationmark2: "exclamation2",
  Exclamationmark3: "exclamation3",
  ExclamationMark: "exclamation",
  Tag: "tag",
  Circle: "circle",
  Text: "text",
  Document: "document",
  Calendar: "calendar",
  Repeat: "repeat",
  List: "list",
  Pin: "pin",
  Pencil: "pencil",
};

export const Form = {
  TextField: () => null,
  TextArea: () => null,
  Dropdown: () => null,
  DatePicker: {
    isFullDay: (d) => false,
  },
};

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const showToast = async () => {};
export const open = async () => {};
export const closeMainWindow = async () => {};
export const getPreferenceValues = () => ({});
export const Tool = {};
export const AI = {
  ask: async () => "",
};
export const environment = {
  canAccess: () => true,
  commandName: "test",
  commandMode: "view",
  extensionName: "apple-reminders",
  isDevelopment: false,
};
export const LaunchType = {
  UserInitiated: "userInitiated",
  Background: "background",
};
export const Clipboard = {
  readText: async () => "",
  copy: async () => {},
};
export const Cache = class {};
export const MenuBarExtra = () => null;
export const List = () => null;
export const ActionPanel = () => null;
export const Action = () => null;
export const LocalStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
};
export const getFrontmostApplication = async () => ({ name: "Safari" });
export const showHUD = async () => {};
export const OAuth = {};


