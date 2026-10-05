import { vi } from "vitest";

export const Clipboard = {
  readText: async () => "Test clipboard content",
};

export const getSelectedText = () => {
  return "Test selected text";
};

export const showToast = vi.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const getPreferenceValues = vi.fn().mockReturnValue({
  vaultPath: "",
  excludedFolders: "",
  configFileName: ".obsidian",
});
