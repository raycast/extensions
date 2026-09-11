import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: {
    supportPath: "/tmp/mule-secure-properties",
  },
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  showToast: vi.fn(),
  showHUD: vi.fn(),
  openExtensionPreferences: vi.fn(),
  Toast: { Style: { Failure: "failure", Success: "success" } },
}));
