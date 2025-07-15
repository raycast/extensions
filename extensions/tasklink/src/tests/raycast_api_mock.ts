import { vi } from "vitest";

export const Clipboard = { paste: vi.fn<() => Promise<void>>() };
export const getPreferenceValues = vi.fn<() => Preferences>();
export const getSelectedText = vi.fn<() => Promise<string>>();
export const showToast = vi.fn<() => Promise<void>>();
export const Toast = {
  Style: {
    Failure: "FAILURE",
  },
};
