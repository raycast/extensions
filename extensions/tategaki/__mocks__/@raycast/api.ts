import { vi } from "vitest";

export const getSelectedText = vi.fn();

export const Clipboard = {
  readText: vi.fn(),
  copy: vi.fn(),
  paste: vi.fn(),
};

export const showToast = vi.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};
