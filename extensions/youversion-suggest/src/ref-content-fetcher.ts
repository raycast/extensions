import cheerio from "cheerio";
import { getDefaultReferenceFormat, getPreferredReferenceFormat } from "./preferences";
import { BibleReference } from "./types";
import { baseReferenceUrl, fetchHTML } from "./utilities";

// Elements that should be surrounded by blank lines
export const blockElems = new Set(["b", "p", "m"]);
// Elements that should trigger a single line break
export const breakElems = new Set(["li1", "q1", "q2", "qc"]);

export function getChapterURL(reference: BibleReference): string {
  const { version, book, chapter } = reference;
  return `${baseReferenceUrl}/${version.id}/${book.id.toUpperCase()}.${chapter}`;
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

// Fetch the textual content of the given Bible reference; returns a promise
export async function fetchReferenceContent(reference: BibleReference): Promise<string> {
  const html = await fetchHTML(getChapterURL(reference));
  const content = parseContentFromHTML(reference, html);
  if (content) {
    return applyReferenceFormat(reference, content);
  } else {
    throw new Error("Fetched reference content is empty");
  }
}

// Parse the given YouVersion HTML and return a string a reference content
export function parseContentFromHTML(reference: BibleReference, html: string): string {
  const $ = cheerio.load(html);
  const $chapter = $(".chapter");
  const contentParts: string[] = [];
  // Loop over sections indicating paragraphs / breaks in the text
  $chapter.children().each((s, section) => {
    const $section = $(section);
    contentParts.push(...getSectionContent(reference, $, $section));
  });
  return normalizeRefContent(contentParts.join(""));
}

// Determine the appropriate amount of spacing (e.g. line/paragraph breaks) to
// insert before the given section of content
export function getSpacingBeforeSection(
  _reference: BibleReference,
  $: cheerio.Root,
  $section: cheerio.Cheerio
): string {
  const sectionType = $section.prop("class");
  if (blockElems.has(sectionType)) {
    return "\n\n";
  } else if (breakElems.has(sectionType)) {
    return "\n";
  } else {
    return "";
  }
}

// Determine the spacing to insert after the given section of content
export function getSpacingAfterSection(_reference: BibleReference, $: cheerio.Root, $section: cheerio.Cheerio): string {
  const sectionType = $section.prop("class");
  if (blockElems.has(sectionType)) {
    return "\n\n";
  } else {
    return "";
  }
}

// Retrieve all reference content within the given section
export function getSectionContent(reference: BibleReference, $: cheerio.Root, $section: cheerio.Cheerio): string[] {
  const sectionContentParts = [getSpacingBeforeSection(reference, $, $section)];
  const $verses = $section.children(".verse");
  $verses.each((v, verse) => {
    const $verse = $(verse);
    if (isVerseWithinRange(reference, $, $verse)) {
      sectionContentParts.push(...$verse.find(".content").text());
    }
  });
  sectionContentParts.push(getSpacingAfterSection(reference, $, $section));
  return sectionContentParts;
}

// Return true if the given verse element is within the designated verse range
export function isVerseWithinRange(reference: BibleReference, $: cheerio.Root, $verse: cheerio.Cheerio): boolean {
  const verseNum = getVerseNumberFromClass(reference, $, $verse);
  if (reference.verse && reference.endVerse) {
    return verseNum >= reference.verse && verseNum <= reference.endVerse;
  } else if (reference.verse) {
    return verseNum === reference.verse;
  } else {
    return true;
  }
}

// Parse the verse number from the given verse element's HTML class
export function getVerseNumberFromClass(_reference: BibleReference, $: cheerio.Root, $verse: cheerio.Cheerio): number {
  return Number($verse.prop("class").match(/v(\d+)/i)[1]);
}

// Strip superfluous whitespace from throughout reference content
export function normalizeRefContent(content: string): string {
  // Strip leading/trailing whitespace for entire reference
  content = content.trim();
  // Collapse consecutive spaces into a single space
  content = content.replace(/ {2,}/gi, " ");
  // Collapse sequences of three or more newlines into two
  content = content.replace(/\n{3,}/gi, "\n\n");
  // Strip leading/trailing whitespace for each paragraph
  content = content.replace(/ ?\n ?/gi, "\n");
  return content;
}
