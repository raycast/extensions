import { vi } from "vitest";

export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

export const showToast = vi.fn();

export const Toast = {
  Style: { Failure: "failure", Success: "success" },
};

export const Icon = {
  ArrowUp: "arrow-up",
  ArrowDown: "arrow-down",
  Dot: "dot",
  Sunrise: "sunrise",
  Moon: "moon",
  Star: "star",
  StarDisabled: "star-disabled",
  Globe: "globe",
  Clipboard: "clipboard",
  Calendar: "calendar",
};

export const Color = {
  Green: "green",
  Red: "red",
  Yellow: "yellow",
  Blue: "blue",
  Orange: "orange",
  PrimaryText: "primary",
  SecondaryText: "secondary",
};
