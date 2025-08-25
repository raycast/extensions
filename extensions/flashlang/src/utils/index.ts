import { getSelectedText, Clipboard } from "@raycast/api";

class NoTextError extends Error {
  constructor() {
    super("No text");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

export async function getSelection() {
  try {
    return await getSelectedText();
  } catch (error) {
    return "";
  }
}

export async function readContent(preferredSource: string = "selected") {
  const clipboard = await Clipboard.readText();
  const selected = await getSelection();

  if (preferredSource === "clipboard") {
    await Clipboard.clear();
    if (clipboard) return clipboard;
    if (selected) return selected;
  } else {
    if (selected) return selected;
    if (clipboard) return clipboard;
  }

  throw new NoTextError();
}
