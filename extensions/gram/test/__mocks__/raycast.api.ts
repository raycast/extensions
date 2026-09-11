import { vi } from "vitest";

export const getPreferenceValues = vi.fn(() => ({
  build: "Gram",
  showGitBranch: false,
  projectIconStyle: "icon",
  showOpenStatus: false,
  autoUpdateInterval: "manual",
}));
