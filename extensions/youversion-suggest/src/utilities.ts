import { Clipboard, showToast, Toast } from "@raycast/api";
import { fetchReferenceContent } from "youversion-suggest";
import { getDefaultReferenceFormat, getPreferredReferenceFormat } from "./preferences";
import { BibleReference } from "./types";

export function normalizeSearchText(searchText: string): string {
  searchText = searchText.toLowerCase();
  // Remove all non-alphanumeric characters
  searchText = searchText.replace(/[\W_]/gi, " ");
  // Remove extra whitespace
  searchText = searchText.trim();
  searchText = searchText.replace(/\s+/g, " ");
  return searchText;
}

export function getReferenceID({
  book,
  chapter,
  verse,
  endVerse,
  version,
}: Pick<BibleReference, "book" | "chapter" | "verse" | "endVerse" | "version">) {
  const bookId = book.id.toUpperCase();
  if (endVerse && verse) {
    return `${version.id}/${bookId}.${chapter}.${verse}-${endVerse}`;
  } else if (verse) {
    return `${version.id}/${bookId}.${chapter}.${verse}`;
  } else {
    return `${version.id}/${bookId}.${chapter}`;
  }
}

export function getReferenceName({
  book,
  chapter,
  verse,
  endVerse,
}: Pick<BibleReference, "book" | "chapter" | "verse" | "endVerse">) {
  if (endVerse && verse) {
    return `${book.name} ${chapter}:${verse}-${endVerse}`;
  } else if (verse) {
    return `${book.name} ${chapter}:${verse}`;
  } else {
    return `${book.name} ${chapter}`;
  }
}

export const baseReferenceUrl = "https://www.bible.com/bible";
export const baseSearchUrl = "https://www.bible.com/search/bible";

export function getReferenceIDFromURL(url: string): string {
  const matches = url?.trim().match(/(\d+\/(?:[^/]+))$/);
  if (matches) {
    return matches[1];
  } else {
    return "";
  }
}

export function buildBibleReference({
  book,
  chapter,
  verse,
  endVerse,
  version,
}: Pick<BibleReference, "book" | "chapter" | "verse" | "endVerse" | "version">) {
  const id = getReferenceID({ book, chapter, verse, endVerse, version });
  const name = getReferenceName({ book, chapter, verse, endVerse });
  return {
    id,
    name,
    url: `${baseReferenceUrl}/${id}`,
    book,
    chapter,
    verse,
    endVerse,
    version,
  };
}

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
    const { content } = await fetchReferenceContent(reference.id);
    Clipboard.copy(await applyReferenceFormat(reference, content || ""));
    showToast({
      style: Toast.Style.Success,
      title: `Copied ${reference.name} (${reference.version.name}) to clipboard`,
    });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not copy to clipboard", message: String(error) });
  }
}
