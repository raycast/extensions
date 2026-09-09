export const LAST_FOLDER_KEY = "lastFolderId";
export const DEFAULT_MODEL_KEY = "defaultModelId";
export const SEND_FORM_STATE_KEY = "sendFormState.v1";

export function shouldOpenAfterMainSend(mode?: string): boolean {
  return mode !== "never";
}

export function shouldOpenAfterQuickSave(mode?: string): boolean {
  return mode === "always";
}
