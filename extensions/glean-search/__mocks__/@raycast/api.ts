import { vi } from "vitest";

export const open = vi.fn();
export const showToast = vi.fn();
export const getPreferenceValues = vi.fn(() => ({}));

export const Toast = {
  Style: {
    Animated: "Animated",
    Success: "Success",
    Failure: "Failure",
  },
};

export const environment = {
  supportPath: "/tmp/test-support",
};
