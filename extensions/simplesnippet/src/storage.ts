import { LocalStorage } from "@raycast/api";

// Storage keys
export const KEYS = {
  DEFAULT_ACTION: "defaultAction",
  PROMPT: "prompt",
  PROMPT_SELECTED: "promptSelected",
  PROMPTS_COUNT: "promptsCount",
};

// Storage utility functions
export const StorageUtil = {
  // Get default action (cut or copy)
  async getDefaultAction(): Promise<boolean> {
    const savedCutAsDefault = await LocalStorage.getItem(KEYS.DEFAULT_ACTION);
    return savedCutAsDefault === 1 || savedCutAsDefault === null;
  },

  // Set default action (cut or copy)
  async setDefaultAction(isCutDefault: boolean): Promise<void> {
    await LocalStorage.setItem(KEYS.DEFAULT_ACTION, isCutDefault ? 1 : 0);
  },

  // Get selected prompt index
  async getSelectedPromptIndex(): Promise<number> {
    const promptSelected = await LocalStorage.getItem(KEYS.PROMPT_SELECTED);
    return typeof promptSelected === "number" ? promptSelected : 0;
  },

  // Set selected prompt index
  async setSelectedPromptIndex(index: number): Promise<void> {
    await LocalStorage.setItem(KEYS.PROMPT_SELECTED, index);
  },

  // Get prompts count
  async getPromptsCount(): Promise<number> {
    const promptsCount = await LocalStorage.getItem(KEYS.PROMPTS_COUNT);
    return typeof promptsCount === "number" ? promptsCount : 1;
  },

  // Set prompts count
  async setPromptsCount(count: number): Promise<void> {
    await LocalStorage.setItem(KEYS.PROMPTS_COUNT, count);
  },

  // Get prompt by index
  async getPrompt(index: number): Promise<string> {
    const prompt = await LocalStorage.getItem(KEYS.PROMPT + index);
    return typeof prompt === "string" ? prompt : "";
  },

  // Set prompt by index
  async setPrompt(index: number, value: string): Promise<void> {
    await LocalStorage.setItem(KEYS.PROMPT + index, value);
  },

  // Remove prompt by index
  async removePrompt(index: number): Promise<void> {
    await LocalStorage.removeItem(KEYS.PROMPT + index);
  },

  // Clear all storage
  async clearAll(): Promise<void> {
    await LocalStorage.clear();
  },
};
