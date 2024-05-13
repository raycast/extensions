import os from "os";

export const fileIcon = "/System/Applications/Notes.app";

export function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "…";
}

export function getOpenNoteURL(uuid: string) {
  const isMacOSVenturaOrLater = parseInt(os.release().split(".")[0]) >= 22;
  return `${isMacOSVenturaOrLater ? "applenotes" : "notes"}://showNote?identifier=${uuid}`;
}
