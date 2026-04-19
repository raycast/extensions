export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  allItems: jest.fn(),
};
export const Clipboard = {
  read: jest.fn(),
  copy: jest.fn(),
};
export const showToast = jest.fn();
export const showHUD = jest.fn();
export const popToRoot = jest.fn();
export const Toast = { Style: { Failure: "failure", Success: "success", Animated: "animated" } };
export const List = () => null;
export const Action = () => null;
export const ActionPanel = () => null;
export const Icon = { Trash: "trash", Download: "download" };
export const environment = { supportPath: "/tmp/raycast-support" };
export const open = jest.fn();
