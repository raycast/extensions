import { vi } from "vitest";

// Mock Raycast API components and functions
export const showToast = vi.fn();
export const showHUD = vi.fn();
export const closeMainWindow = vi.fn();
export const open = vi.fn();
export const launchCommand = vi.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const Icon = {
  Music: "music-icon",
  Star: "star-icon",
  List: "list-icon",
  Grid: "grid-icon",
  ArrowClockwise: "arrow-clockwise-icon",
  ArrowUp: "arrow-up-icon",
  ArrowDown: "arrow-down-icon",
  TwoPeople: "two-people-icon",
  TextDocument: "text-document-icon",
  Link: "link-icon",
  CopyClipboard: "copy-clipboard-icon",
  Trash: "trash-icon",
  MagnifyingGlass: "magnifying-glass-icon",
};

export const Action = {
  Style: {
    Destructive: "destructive",
  },
};

export const LaunchType = {
  UserInitiated: "user-initiated",
  Background: "background",
};

export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock React components
interface MockComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const List = Object.assign(({ children }: MockComponentProps) => children, {
  Item: ({ children }: MockComponentProps) => children,
  Section: ({ children }: MockComponentProps) => children,
  EmptyView: ({ children }: MockComponentProps) => children,
});

export const Grid = Object.assign(({ children }: MockComponentProps) => children, {
  Item: ({ children }: MockComponentProps) => children,
  Section: ({ children }: MockComponentProps) => children,
  EmptyView: ({ children }: MockComponentProps) => children,
});

export const ActionPanel = Object.assign(({ children }: MockComponentProps) => children, {
  Section: ({ children }: MockComponentProps) => children,
});

export const MenuBarExtra = Object.assign(({ children }: MockComponentProps) => children, {
  Item: ({ children }: MockComponentProps) => children,
  Section: ({ children }: MockComponentProps) => children,
});

export const Keyboard = {
  KeyEquivalent: {},
};
