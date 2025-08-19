export const showToast = jest.fn();
export const showHUD = jest.fn(() => Promise.resolve());
export const getPreferenceValues = jest.fn(() => ({}));
export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const List = jest.fn();
List.Item = jest.fn();
List.Dropdown = jest.fn();
List.Dropdown.Item = jest.fn();

export const ActionPanel = jest.fn();
ActionPanel.Section = jest.fn();
ActionPanel.Submenu = jest.fn();

export const Action = jest.fn();
Action.OpenInBrowser = jest.fn();
Action.CopyToClipboard = jest.fn();

export const Icon = {
  Document: "document",
  Link: "link",
  Globe: "globe",
  Clipboard: "clipboard",
  Eye: "eye",
  Calendar: "calendar",
  Tag: "tag",
  Person: "person",
  Star: "star",
};

export const Color = {
  Blue: "blue",
  Green: "green",
  Orange: "orange",
  Red: "red",
  Purple: "purple",
  Yellow: "yellow",
  Magenta: "magenta",
  PrimaryText: "primary",
  SecondaryText: "secondary",
};
