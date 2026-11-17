import { basename } from "path";
import { isProbablyUrl, SaveInput } from "./save-input";

export type SaveKind = "url" | "note" | "file";

/** Where a detected prefill came from. */
export type SaveSourceId = "selection" | "tab" | "finder" | "clipboard";

export type DetectedInput = Exclude<SaveInput, { kind: "empty" }>;

export type SaveSource = {
  id: SaveSourceId;
  input: DetectedInput;
  /** The app the source was read from, e.g. the browser that owns the tab. */
  appName?: string;
};

/**
 * Selecting text is deliberate, so it wins. Then whatever the frontmost app is showing
 * (the browser's tab, Finder's selection), and the clipboard last because it's often stale.
 */
export const SAVE_SOURCE_PRIORITY: readonly SaveSourceId[] = ["selection", "tab", "finder", "clipboard"];

const FINDER_BUNDLE_ID = "com.apple.finder";

export function isFinderBundleId(bundleId?: string): boolean {
  return bundleId?.toLowerCase() === FINDER_BUNDLE_ID;
}

/** Finder reports the selected files' names as "selected text", which would beat the files. */
export function shouldReadSelectedText(bundleId?: string): boolean {
  return !isFinderBundleId(bundleId);
}

export function toDetectedInput(input: SaveInput): DetectedInput | undefined {
  return input.kind === "empty" ? undefined : input;
}

export function sortSaveSources(sources: Array<SaveSource | undefined>): SaveSource[] {
  return sources
    .filter((source): source is SaveSource => Boolean(source))
    .sort((a, b) => SAVE_SOURCE_PRIORITY.indexOf(a.id) - SAVE_SOURCE_PRIORITY.indexOf(b.id));
}

function describeFiles(files: string[]): string {
  return files.length === 1 ? basename(files[0]) : `${files.length} files`;
}

export function getSaveSourceTitle(source: SaveSource): string {
  switch (source.id) {
    case "selection":
      return "Selected Text";
    case "tab":
      return source.appName ? `Current Tab in ${source.appName}` : "Current Tab";
    case "finder":
      return source.input.kind === "files" ? `Finder (${describeFiles(source.input.value)})` : "Finder";
    case "clipboard":
      if (source.input.kind === "files") {
        return `Clipboard (${describeFiles(source.input.value)})`;
      }

      return source.input.kind === "url" ? "Clipboard (Link)" : "Clipboard (Text)";
  }
}

/**
 * What the form saves, worked out from what's filled in: files upload as files (the text becomes
 * the note attached to each), a URL saves as a link, and anything else saves as a note.
 */
export function getSaveKind(input: string, files: string[]): SaveKind | undefined {
  if (files.length > 0) {
    return "file";
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return undefined;
  }

  return isProbablyUrl(trimmed) ? "url" : "note";
}

export function joinNoteParts(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}
