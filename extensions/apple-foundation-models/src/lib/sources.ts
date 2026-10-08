import {
  Clipboard,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedFinderItems,
  getSelectedText,
} from "@raycast/api";
import { fileURLToPath } from "node:url";
import { hasClipboardImage } from "./clipboard-image";
import { isImageFile } from "./images";

export type TextOrigin = "selection" | "clipboard";
export type ImageOrigin = "finder" | "clipboard-file" | "clipboard-image" | "file";

export interface TextInput {
  text: string;
  origin: TextOrigin;
}

export interface ImageInput {
  /** Not set for image data on the clipboard: it is saved to a file only when it is used. */
  path?: string;
  origin: ImageOrigin;
}

export const imageOriginLabels: Record<ImageOrigin, string> = {
  finder: "the image selected in Finder",
  "clipboard-file": "the image file on the clipboard",
  "clipboard-image": "the image on the clipboard",
  file: "the chosen file",
};

/** Clipboard file paths can come as plain paths or as file URLs. */
export function toFilePath(file: string): string {
  return file.startsWith("file://") ? fileURLToPath(file) : file;
}

/** The first image among the Finder selection, then the copied file. */
export function pickImageFile(finderPaths: string[], clipboardFile?: string): ImageInput | undefined {
  const fromFinder = finderPaths.find(isImageFile);
  if (fromFinder) return { path: fromFinder, origin: "finder" };
  const copied = clipboardFile ? toFilePath(clipboardFile) : undefined;
  if (copied && isImageFile(copied)) return { path: copied, origin: "clipboard-file" };
  return undefined;
}

/** The text selected in the frontmost app, or undefined when nothing is selected. */
export async function readSelectedText(): Promise<TextInput | undefined> {
  const selected = await getSelectedText().catch(() => "");
  return selected.trim() ? { text: selected, origin: "selection" } : undefined;
}

/** The text on the clipboard, when the preference allows using it. */
export async function readClipboardText(): Promise<TextInput | undefined> {
  if (getPreferenceValues<ExtensionPreferences>().useClipboard === false) return undefined;
  const copied = (await Clipboard.readText().catch(() => undefined)) ?? "";
  return copied.trim() ? { text: copied, origin: "clipboard" } : undefined;
}

/** The selected text, or the clipboard text when nothing is selected. */
export async function readTextInput(): Promise<TextInput | undefined> {
  return (await readSelectedText()) ?? (await readClipboardText());
}

const FINDER_BUNDLE_ID = "com.apple.finder";

/**
 * The image selected in Finder. Finder is only asked when it is the frontmost app: its selection does not count
 * otherwise, and asking makes macOS show a permission prompt for controlling Finder.
 */
export async function findFinderImage(): Promise<ImageInput | undefined> {
  const frontmost = await getFrontmostApplication().catch(() => undefined);
  if (frontmost?.bundleId !== FINDER_BUNDLE_ID) return undefined;
  const finderPaths = await getSelectedFinderItems()
    .then((items) => items.map((item) => item.path))
    .catch(() => [] as string[]);
  return pickImageFile(finderPaths);
}

/** A copied image file, or image data on the clipboard. */
export async function findClipboardImage(): Promise<ImageInput | undefined> {
  const clipboard = await Clipboard.read().catch(() => undefined);
  const copied = pickImageFile([], clipboard?.file);
  if (copied) return copied;
  return (await hasClipboardImage().catch(() => false)) ? { origin: "clipboard-image" } : undefined;
}

/** An image from the Finder selection, a copied image file, or image data on the clipboard, in that order. */
export async function findImageInput(): Promise<ImageInput | undefined> {
  return (await findFinderImage()) ?? (await findClipboardImage());
}
