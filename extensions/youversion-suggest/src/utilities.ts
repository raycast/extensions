import { Clipboard, showToast, Toast } from "@raycast/api";
import fsPromises from "fs/promises";
import fetch from "node-fetch";
import path from "path";
import { fetchReferenceContent } from "./ref-content-fetcher";
import { BibleBookMetadata, BibleData, BibleLanguage, BibleReference, JSONSerializable } from "./types";

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

export function buildBibleReferenceFromID(id: string, bible: BibleData): BibleReference {
  const matches = id.match(/^(\d+)\/([a-z0-9]{3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/i) || [];
  const versionId = Number(matches[1]);
  const bookId = matches[2];
  const chapter = Number(matches[3]);
  const verse = Number(matches[4]) || null;
  const endVerse = Number(matches[5]) || null;
  return buildBibleReference({
    book: bible.books.find((book) => book.id === bookId) || {
      id: "",
      name: "",
    },
    chapter: chapter,
    verse: verse ? verse : null,
    endVerse: endVerse ? endVerse : null,
    version: bible.versions.find((version) => version.id === versionId) || {
      id: 0,
      name: "",
      full_name: "",
    },
  });
}

export async function getJSONData<T extends JSONSerializable>(path: string): Promise<T> {
  return JSON.parse(String(await fsPromises.readFile(path)));
}

export async function getBibleData(language: string): Promise<BibleData> {
  return getJSONData(path.join(__dirname, "assets", "data", "bible", `bible-${language}.json`));
}

export async function getBibleBookMetadata(): Promise<{ [key: string]: BibleBookMetadata }> {
  return getJSONData(path.join(__dirname, "assets", "data", "bible", `book-metadata.json`));
}

export async function getLanguages(): Promise<BibleLanguage[]> {
  return getJSONData(path.join(__dirname, "assets", "data", "bible", `languages.json`));
}

export function fetchHTML(url: string): Promise<string> {
  return fetch(url, {
    headers: {
      "User-Agent": "YouVersion Suggest",
    },
  }).then((response) => response.text());
}

export async function copyContentToClipboard(reference: BibleReference) {
  try {
    showToast({
      style: Toast.Style.Animated,
      title: `Copying ${reference.name} to clipboard...`,
    });
    const referenceContent = await fetchReferenceContent(reference);
    Clipboard.copy(referenceContent);
    showToast({
      style: Toast.Style.Success,
      title: `Copied ${reference.name} (${reference.version.name}) to clipboard`,
    });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not copy to clipboard", message: String(error) });
  }
}
