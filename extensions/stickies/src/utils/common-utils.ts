import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { StickiesNote } from "./stickies-utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const showStickiesNotRunningHUD = async () => {
  await showToast({ title: "Stickies is not running", style: Toast.Style.Failure });
};

export function truncate(str: string, maxLength = 30): string {
  let length = 0;
  let i;
  for (i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      length += 2.2;
    } else {
      length += 1;
    }

    if (length > maxLength) {
      break;
    }
  }
  return str.substring(0, i) + (i < str.length ? "…" : "");
}

export function firstLine(stickiesNotes: StickiesNote[]) {
  const firstNonEmptyNote = stickiesNotes.find((note) => note.content.trim() !== "");
  if (!firstNonEmptyNote) {
    return "";
  }
  const firstLine = firstNonEmptyNote.content.trim().split("\n")[0];
  return truncate(firstLine, 40);
}

export async function handleClipboardOperation(operation: string, content: string, hudMessage: string) {
  if (operation === "copy") {
    await Clipboard.copy(content);
  } else {
    await Clipboard.paste(content);
  }
  await showHUD(hudMessage);
}
