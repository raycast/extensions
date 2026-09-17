import { Clipboard, getSelectedText } from "@raycast/api";

export class NoTextError extends Error {
  constructor() {
    super("No text");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

async function getSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

export async function readContent(preferredSource: string): Promise<string> {
  const [clipboardRaw, selected] = await Promise.all([Clipboard.readText(), getSelection()]);
  const clipboard = clipboardRaw ?? "";

  if (preferredSource === "clipboard") {
    if (clipboard) return clipboard;
    if (selected) return selected;
  } else {
    if (selected) return selected;
    if (clipboard) return clipboard;
  }

  throw new NoTextError();
}
