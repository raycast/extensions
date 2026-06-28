import { getSelectedText, Clipboard } from "@raycast/api";

export const isNotEmpty = (string: string | null | undefined): string is string => {
  return string != null && String(string).trim().length > 0;
};

export const readtext = (fallbackText?: string) =>
  isNotEmpty(fallbackText)
    ? fallbackText?.trim()
    : getSelectedText()
        .then((text) => (isNotEmpty(text) ? text : Clipboard.readText()))
        .catch(() => undefined);
