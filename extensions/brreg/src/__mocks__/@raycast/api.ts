import { vi } from "vitest";

export const Icon = {
  Globe: "Globe",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  Clipboard: "Clipboard",
  AppWindowSidebarLeft: "AppWindowSidebarLeft",
  AlignLeft: "AlignLeft",
  Coins: "Coins",
  Map: "Map",
  ChevronLeft: "ChevronLeft",
  Eye: "Eye",
  EyeDisabled: "EyeDisabled",
};

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};

export const Clipboard = {
  copy: vi.fn().mockResolvedValue(undefined),
};

export const showToast = vi.fn().mockResolvedValue(undefined);

export const Action = {};
export const ActionPanel = { Section: {}, Submenu: {} };
export const Detail = { Metadata: { Label: {}, Link: {}, TagList: { Item: {} }, Separator: {} } };
export const Form = { TextField: {} };
export const List = { Item: {}, Section: {} };
export const useNavigation = vi.fn(() => ({ pop: vi.fn() }));
