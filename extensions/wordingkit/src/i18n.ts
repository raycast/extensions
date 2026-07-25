type UiStrings = {
  rewriteSelectedText: string;
  rewriteFailed: string;
  openSettings: string;
  noModes: string;
  noModesDescription: string;
  cancel: string;
  rewrite: string;
  selectionMissing: string;
  selectedTextTooLong: (length: number, maximum: number) => string;
  configureApiKey: string;
  rewriteCancelled: string;
  editingModes: string;
  english: string;
  russian: string;
  resetModes: string;
  resetModesQuestion: string;
  resetModesDescription: (language: string) => string;
  reset: string;
  createMode: string;
  editMode: string;
  deleteMode: string;
  deleteModeQuestion: string;
  deleteModeDescription: (title: string) => string;
  moveUp: string;
  moveDown: string;
  orderInRewrite: string;
  customOrder: string;
  lastUsedOrder: string;
  openPreferences: string;
  modeFormInvalid: string;
  newMode: string;
  save: string;
  title: string;
  description: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: string;
  maxTokens: string;
  actionFailed: (action: string) => string;
  damagedStorage: string;
  invalidModeField: (field: string) => string;
  unsupportedSort: string;
  modeNotFound: string;
};

export const UI_STRINGS: UiStrings = {
  rewriteSelectedText: "Rewrite Selected Text",
  rewriteFailed: "Could Not Rewrite Text",
  openSettings: "Open Settings",
  noModes: "No Modes",
  noModesDescription: "Create a mode in Settings to rewrite text.",
  cancel: "Cancel",
  rewrite: "Rewrite",
  selectionMissing: "No text selected",
  selectedTextTooLong: (length, maximum) =>
    `Selected text is too long (${length} characters). Maximum: ${maximum}.`,
  configureApiKey: "Configure an API key in Preferences",
  rewriteCancelled: "Processing was cancelled or exceeded 60 seconds.",
  editingModes: "Editing Modes",
  english: "English",
  russian: "Russian",
  resetModes: "Reset Modes",
  resetModesQuestion: "Reset modes?",
  resetModesDescription: (language) =>
    `All saved modes will be replaced with the ${language} defaults.`,
  reset: "Reset",
  createMode: "Create Mode",
  editMode: "Edit Mode",
  deleteMode: "Delete Mode",
  deleteModeQuestion: "Delete mode?",
  deleteModeDescription: (title) =>
    `Mode “${title}” will be permanently deleted.`,
  moveUp: "Move Up",
  moveDown: "Move Down",
  orderInRewrite: "Order in Rewrite This",
  customOrder: "Custom Order",
  lastUsedOrder: "Last Used",
  openPreferences: "Open Preferences",
  modeFormInvalid: "Check mode settings",
  newMode: "New Mode",
  save: "Save",
  title: "Title",
  description: "Description",
  provider: "Provider",
  model: "Model",
  systemPrompt: "System Prompt",
  temperature: "Temperature",
  maxTokens: "Maximum Tokens",
  actionFailed: (action) => `Could not ${action.toLowerCase()}`,
  damagedStorage: "Saved modes are corrupted. Edit them in Settings.",
  invalidModeField: (field) => `Invalid mode ${field}.`,
  unsupportedSort: "Choose a supported sort order.",
  modeNotFound: "Mode not found.",
};

export function getUiStrings(): UiStrings {
  return UI_STRINGS;
}
