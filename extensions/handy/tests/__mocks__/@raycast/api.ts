import { vi } from "vitest";

export const trash = async (_path: string): Promise<void> => {};

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
} as const;

export const showHUD = vi.fn(async () => {});
export const showToast = vi.fn(async () => {});
export const getPreferenceValues = vi.fn(() => ({
  handyBinaryPath: "/Applications/Handy.app/Contents/MacOS/Handy",
}));
