import { Clipboard, getSelectedFinderItems, getSelectedText } from "@raycast/api";
import { isImageFile, isSupportedLink } from "./models";

/** The first image selected in Finder or File Explorer, if any. */
export async function selectedImage(): Promise<string | undefined> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).find(isImageFile);
  } catch {
    return undefined;
  }
}

/** The text selected in the frontmost app, if any. */
export async function selectedText(): Promise<string | undefined> {
  try {
    const text = await getSelectedText();
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** A supported video link from the selection or the clipboard, if any. */
export async function linkFromSelectionOrClipboard(): Promise<string | undefined> {
  const candidates = [await selectedText(), await Clipboard.readText().catch(() => undefined)];
  return candidates.map((value) => value?.trim()).find((value): value is string => !!value && isSupportedLink(value));
}
