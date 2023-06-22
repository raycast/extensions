import { Clipboard, showToast, Toast } from "@raycast/api";
import { fetchReferenceContent } from "youversion-suggest";
import {
  getDefaultReferenceFormat,
  getPreferredLanguage,
  getPreferredLineBreaksSetting,
  getPreferredReferenceFormat,
  getPreferredVerseNumbersSetting,
} from "./preferences";
import { BibleReference } from "./types";

export async function applyReferenceFormat(reference: BibleReference, content: string): Promise<string> {
  const referenceFormat = (await getPreferredReferenceFormat()) || (await getDefaultReferenceFormat());
  return referenceFormat
    .replace(/{name}/gi, reference.name)
    .replace(/{version}/gi, reference.version.name)
    .replace(/{content}/gi, content);
}

export function isReferenceFormatValid(newFormat: string): boolean {
  const evaluatedFormat = newFormat
    .replace(/{name}/gi, "John 11:35")
    .replace(/{version}/gi, "NIV")
    .replace(/{content}/gi, "Jesus wept.");
  return !(evaluatedFormat.includes("{") || evaluatedFormat.includes("}"));
}

export async function copyContentToClipboard(reference: BibleReference) {
  try {
    showToast({
      style: Toast.Style.Animated,
      title: `Copying ${reference.name} to clipboard...`,
    });
    const { content } = await fetchReferenceContent(reference.id, {
      language: await getPreferredLanguage(),
      includeVerseNumbers: await getPreferredVerseNumbersSetting(),
      includeLineBreaks: await getPreferredLineBreaksSetting(),
    });
    Clipboard.copy(await applyReferenceFormat(reference, content || ""));
    showToast({
      style: Toast.Style.Success,
      title: `Copied ${reference.name} (${reference.version.name}) to clipboard`,
    });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not copy to clipboard", message: String(error) });
  }
}
