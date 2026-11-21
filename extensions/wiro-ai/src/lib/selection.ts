import { Clipboard, getSelectedFinderItems, getSelectedText } from "@raycast/api";
import { fileURLToPath } from "node:url";
import { fileMatchesKind, type MediaKind } from "./params";

function toPath(value: string): string {
  return value.startsWith("file://") ? fileURLToPath(value) : value;
}

/**
 * Files of this kind to start a form with: the Finder selection, else a file on the clipboard.
 * Either may be missing; Finder answers only while it is the frontmost app.
 */
export async function selectedFiles(kind: Exclude<MediaKind, "file">): Promise<string[]> {
  try {
    const items = await getSelectedFinderItems();
    const matching = items.map((item) => item.path).filter((path) => fileMatchesKind(path, kind));
    if (matching.length > 0) return matching;
  } catch {
    // Finder is not frontmost or nothing is selected: try the clipboard.
  }
  try {
    const { file } = await Clipboard.read();
    if (file && fileMatchesKind(toPath(file), kind)) return [toPath(file)];
  } catch {
    // Nothing usable on the clipboard.
  }
  return [];
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
