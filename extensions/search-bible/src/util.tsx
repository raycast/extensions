import { JUBILEE_APP_ABBREV_MAP, NT_BOOKS, OBSIDIAN_ABBREV_MAP, RCV_APP_ABBREV_MAP, Ref } from "./types";
import { Verse, Query, OT_BOOKS, BOOKS_ABBREV, ABBREV_MAP } from "./types";

interface listItem {
  markdown: string | null | undefined;
  footnote: string;
  title: string;
  detail: string;
  verse: Verse;
}

export function createMarkdown(
  prefs: Preferences,
  verses: Verse[] | undefined,
  filter: string | undefined,
): listItem[] {
  if (!verses) {
    return [];
  }
  return verses.map((v) => {
    let filterText = "";
    if (filter) {
      const words = v.text.split(" ");
      const filterIndex = words.findIndex((word) => word.toLowerCase().includes(filter.trim().toLowerCase()));
      let startIndex = Math.max(0, filterIndex - 1);
      let endIndex = Math.min(words.length - 1, filterIndex + 2);
      if (startIndex === 0) {
        endIndex = Math.min(endIndex + (2 - filterIndex), words.length - 1);
      } else if (endIndex === words.length - 1) {
        startIndex = Math.max(startIndex - (2 - (words.length - 1 - filterIndex)), 0);
      }
      filterText = `${startIndex > 0 ? "..." : ""}${words.slice(startIndex, endIndex + 1).join(" ")}${endIndex < words.length - 1 ? "..." : ""}`;
    } else {
      filterText = v.text;
    }

    let footnote = v.footnote;
    if (footnote) {
      footnote = boldenFootnoteLines(footnote);
      footnote = "> " + footnote.replace(/\n/g, "\n>");
    } else {
      footnote = "";
    }
    const title = `${v.book_name}. ${v.chapter}:${v.verse} ${filterText}`;
    const markdown = `**${v.book_name}. ${v.chapter}:${v.verse}** ${v.text.replace(/\s+/g, " ")}

    ${footnote ? "\n> " + footnote.replace(/\n/g, "\n\n>") : ""}
    `;
    const detail = `> **[${v.book_name}. ${v.chapter}:${v.verse}](${getRcvUrlForVerse(v)})** ${v.text.replace(/\s+/g, " ")}`;

    footnote = footnote
      ? `> [!note]- **[${v.book_name}. ${v.chapter}:${v.verse}](${getRcvUrlForVerse(v)})** ${v.text.replace(/\s+/g, " ")}
      ${footnote}`
      : "";
    return { title, detail, markdown, verse: v, footnote };
  });
}

export function createClipboardText(refs: Preferences, verses: Verse[] | undefined) {
  if (!verses) {
    return "";
  }
  return verses
    .map(
      (v) => `> **[${v.book_name}. ${v.chapter}:${v.verse}](${getRcvUrlForVerse(v)})** ${v.text.replace(/\s+/g, " ")}`,
    )
    .join("\n");
}
export function createObsidianLinks(refs: Preferences, verses: Verse[] | undefined) {
  if (!verses) {
    return "";
  }
  return verses
    .map(
      (v) =>
        `![[${OBSIDIAN_ABBREV_MAP.get(v.book_name_long)}#^${v.chapter}-${v.verse}|${v.book_name}. ${v.chapter}:${v.verse}]]`,
    )
    .join("\n");
}

function boldenFootnoteLines(footnotes: string) {
  const footnotesArr = footnotes.split("\n");
  const footnotesNew: string[] = [];
  let afterEmptyLine = true;

  footnotesArr.forEach((line) => {
    if (afterEmptyLine && !(line.trim() === "")) {
      footnotesNew.push(`**${line}**`);
      afterEmptyLine = false;
    } else {
      footnotesNew.push(line);
    }
    if (line.trim() === "") {
      afterEmptyLine = true;
    }
  });
  return footnotesNew.join("\n");
}

export function createClipboardTextWithFootnotes(refs: Preferences, verses: Verse[] | undefined) {
  if (!verses) {
    return "";
  }

  return verses
    .map((v) => {
      let footnote = "";
      if (v.footnote) {
        footnote = boldenFootnoteLines(v.footnote);
      }
      return { ...v, footnote };
    })
    .map(
      (v) =>
        `> [!note]- **[${v.book_name}. ${v.chapter}:${v.verse}](${getRcvUrlForVerse(v)})** ${v.text.replace(/\s+/g, " ")}${v.footnote ? "\n> " + v.footnote.replace(/\n/g, "\n >") : ""}`,
    )
    .join("\n\n");
}

export function createVerseList(refs: Preferences, verses: Verse[] | undefined) {
  if (!verses) {
    return "";
  }

  return verses.map((v) => `[${v.book_name}. ${v.chapter}:${v.verse}](${getRcvUrlForVerse(v)})`).join(", ");
}

export function createReferenceList(verses: Verse[]) {
  const refList = verses.map((v) => `${v.book_name}. ${v.chapter}:${v.verse}`).join("; ");
  return `${refList}`;
}

/**
 * Simple parser for bible references.
 *
 * Parses "John 3:16 NIV" into { ref: "John 3:16", version: "NIV" }
 * Parses "John3:16 (NIV)" into { ref: "John 3:16", version: "NIV" }
 * Parses "John 3:16" into { ref: "John 3:16", version: undefined }
 * Parses "John3:16 (ZZZZ)" into { ref: "John 3:16 (ZZZZ)", version: undefined }
 */
export function cleanseQuery(query: string): { ref: string } {
  console.log("query", query);
  let trimmedReference = query.trim();
  trimmedReference = trimmedReference.split(" - ")[1];
  return { ref: trimmedReference };
}

export function mapBookToRcVAbbrev(longBookName: string): string | undefined {
  const mappedAbbrev = RCV_APP_ABBREV_MAP.get(longBookName);
  if (mappedAbbrev) {
    return mappedAbbrev;
  }
  return undefined;
}
export function mapBookToJubAbbrev(longBookName: string): string | undefined {
  const mappedAbbrev = JUBILEE_APP_ABBREV_MAP.get(longBookName);
  if (mappedAbbrev) {
    return mappedAbbrev;
  }
  return undefined;
}

export function getBookIndex(longBookName: string): string {
  const keysArray = Array.from(RCV_APP_ABBREV_MAP.keys());
  return (keysArray.indexOf(longBookName) + 1).toString().padStart(2, "0");
}

export function getUrlForVerse(verse: Verse): string {
  const url =
    "file:///Users/nicolaikrebs/Documents/RcvBible_Footnotes/RcvBible_Footnotes/Jubilee%20Bible/" +
    mapBookToJubAbbrev(verse.book_name_long) +
    ".htm" +
    (verse.chapter ? "#v" + verse.chapter + (verse.verse ? "_" + verse.verse : "") : "");
  return url;
}
export function getRcvUrlForVerse(verse: Verse): string {
  let book_name = verse.book_name_long;
  if (book_name == "Song of Solomon") book_name = "Song of Songs";
  const url =
    "https://text.recoveryversion.bible/" +
    getBookIndex(verse.book_name_long) +
    "_" +
    book_name.replace(/[\s]/g, "") +
    "_" +
    verse.chapter +
    ".htm" +
    (mapBookToRcVAbbrev(verse.book_name_long)
      ? "#" + mapBookToRcVAbbrev(verse.book_name_long) + verse.chapter + "-" + verse.verse
      : "");
  return url;
}

export function getBibleHubUrlForVerse(verse: Verse): string {
  console.log("verse", verse);
  const url =
    "http://biblehub.com/interlinear/" +
    verse.book_name_long.replace(/[\s]/g, "_").toLowerCase() +
    "/" +
    verse.chapter +
    (verse.verse ? "-" + verse.verse : "") +
    ".htm";
  return url;
}

export function getVerseRef(verse: Verse): string {
  console.log("verse", verse);
  return `[${verse.book_name}. ${verse.chapter}:${verse.verse}](${getRcvUrlForVerse(verse)})`;
}

export function getObsidianLink(v: Verse): string {
  console.log("verse", v);
  return `[[${OBSIDIAN_ABBREV_MAP.get(v.book_name_long)}#^${v.chapter}-${v.verse}|${v.book_name}. ${v.chapter}:${v.verse}]]`;
}

// function parseOTNT(maybeMode: string, validMode: string[]): string | undefined {
//   maybeMode = maybeMode
//     .replace(/[()[\]]/gi, "") // remove brackets and parentheses
//     .toUpperCase();
//   const isMode = validMode.some(([, mode]) => mode === maybeMode);
//   return isMode ? maybeMode : undefined;
// }

export function parseQuery(query: string): Query | undefined {
  if (!query) {
    return undefined;
  }

  const refs: Ref[] = [];
  let previousRef: Ref | undefined = undefined;
  // remove everything before " - "
  const queryParts = query.split(" - ");
  if (queryParts.length > 1) {
    query = queryParts[queryParts.length - 1];
    console.log("Removed first part of query before last ' - ': ", query);
  }
  const parts = query.split(/[;,]/);
  console.log("parts", parts);

  const isVerseSeparation: boolean[] = [];
  isVerseSeparation.push(false);
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (char === ",") {
      isVerseSeparation.push(true);
    } else if (char === ";") {
      isVerseSeparation.push(false);
    }
  }

  let filter = "";
  let verseSepIndex = 0;
  for (const part of parts) {
    if (!part.trim()) {
      continue;
    }
    const ref = parseRef(part.trim(), previousRef, isVerseSeparation[verseSepIndex]);
    verseSepIndex++;
    if (ref) {
      refs.push(ref);
      previousRef = ref;
    } else {
      filter = part;
    }
  }
  console.log("refs", refs);
  console.log("filter", filter);
  return { filter: filter, refs };
}

function matchesBibleBook(ref: string): boolean {
  const allBooks = [...OT_BOOKS, ...NT_BOOKS, ...BOOKS_ABBREV, ...ABBREV_MAP.keys()];
  return allBooks.some((book) => book.toLowerCase() === ref.toLowerCase());
}

/**
 * Parses a single reference string into a Ref object.
 * Supports the following formats:
 * - John 3:16
 * - John 3:16-17
 * - John 3:16-4:17
 * - John 3:16-4
 * - 3:16-17
 * - 16-17
 *
 * @param ref Reference string to parse
 * @param previousRef Previous reference object to use for context
 * @param isVerseSeparation Whether the current ref is a verse separation
 * @returns Parsed Ref object or undefined if the ref is invalid
 */
export function parseRef(ref: string, previousRef: Ref | undefined, isVerseSeparation: boolean): Ref | undefined {
  // supports 1.Mose 18:10-15; 21:1-3, 6-7, 5-19:3; 2.Mose 1:1-3:4
  const regex = /^(\d?\s*\.?\s?\w+)?\.?\s*(\d+)?(?::(\d+)[a-z]?)?(?:-(\d+)(?::(\d+))?[a-z]?)?$/;
  //              1 book                  2 cFr/vFr  3 vFrom   4 cTo/vTo  5 vTo

  ref = ref
    .trim()
    .replace(/[.,?!":]$/, "")
    .replace(/["'`*']/g, "");
  console.log("ref", ref);
  const match = ref.match(regex);
  console.log("match: " + match + " previousRef: " + previousRef?.book);
  if (!match) {
    const bookRef = ref.replace(/\s|\./g, "");
    if (matchesBibleBook(bookRef)) {
      return { book: bookRef, chapterFrom: undefined, verseFrom: undefined, chapterTo: undefined, verseTo: undefined };
    }
    console.error(`Error parsing ref: invalid format for reference '${ref}'`);
    return undefined;
  }
  if (match[1] && !match[2] && match[3]) {
    match[2] = match[1];
    match[1] = "";
  }
  const parsedRef: Ref = {
    book: "",
    chapterFrom: undefined,
    verseFrom: undefined,
    chapterTo: undefined,
    verseTo: undefined,
  };

  if (isVerseSeparation) {
    // only verse or verse range (e.g. 1, 1-3) is given in the current ref
    // so we should use the book and chapter from the previous ref
    if (!previousRef || !previousRef.book || !previousRef.chapterFrom) {
      console.log(
        `Error parsing verse range: book and chapter must be defined in the previous ref '${previousRef}' (current ref: '${ref}')`,
      );
      return undefined;
    }
    parsedRef.book = previousRef.book;
    parsedRef.chapterFrom = previousRef.chapterFrom;
    if (match[2] || match[1]) {
      // verseFrom
      if (match[1]) {
        parsedRef.verseFrom = parseInt(match[1]);
      } else {
        parsedRef.verseFrom = parseInt(match[2]);
      }
    }
    if (match[4]) {
      if (match[5]) {
        // verse range
        parsedRef.chapterTo = parseInt(match[4]);
        parsedRef.verseTo = parseInt(match[5]);
      } else {
        // verseTo
        parsedRef.verseTo = parseInt(match[4]);
      }
    }
    if (match[3]) {
      // invalid format for verse range
      console.log(`Error parsing verse range: invalid format for verse range in ref '${ref}'`);
      return undefined;
    }

    if (parsedRef.book === "2Jn" || parsedRef.book === "3Jn" || parsedRef.book === "Oba") {
      parsedRef.verseFrom = parsedRef.chapterFrom;
      parsedRef.chapterFrom = 1;
      if (parsedRef.verseTo) {
        parsedRef.verseTo = parsedRef.chapterTo;
        parsedRef.chapterTo = 1;
      }
    }
    return parsedRef;
  }

  // reference is either only book or includes chapter reference
  if (match[1]) {
    // book, e.g. John
    const book = match[1].replace(/\s|\./g, "");
    if (!matchesBibleBook(book)) {
      return undefined;
    } else {
      const mappedAbbrev = ABBREV_MAP.get(book);
      if (mappedAbbrev) {
        parsedRef.book = mappedAbbrev;
      } else {
        parsedRef.book = book;
      }
    }
  } else if (previousRef) {
    parsedRef.book = previousRef.book;
  } else {
    console.log(`Error parsing ref: book must be defined in the reference '${
      ref
    }' or in the previous ref '${previousRef}'
      `);
    return undefined;
  }

  if (match[2] && match[3]) {
    // match[2] is chapterFrom, match[3] is verse, e.g. John 1:1(-3(:4)?)?
    parsedRef.chapterFrom = parseInt(match[2]);
    parsedRef.verseFrom = parseInt(match[3]);
    if (match[4]) {
      // chapterTo or verseTo
      if (match[5]) {
        // John 1:1-3:4
        parsedRef.chapterTo = parseInt(match[4]);
        parsedRef.verseTo = parseInt(match[5]);
      } else {
        // John 1:1-3
        parsedRef.verseTo = parseInt(match[4]);
      }
    }
  } else if (match[2]) {
    // match[2] is chapterFrom, match[3] is not given, e.g. John 1(-3(:4)?)?
    parsedRef.chapterFrom = parseInt(match[2]);
    if (match[4]) {
      // chapterTo or verseTo
      if (match[5]) {
        // John 1-3:4
        parsedRef.chapterTo = parseInt(match[4]);
        parsedRef.verseTo = parseInt(match[5]);
      } else {
        // John 1-3
        parsedRef.chapterTo = parseInt(match[4]);
      }
    }
  }
  if (parsedRef.book === "2Jn" || parsedRef.book === "3Jn" || parsedRef.book === "Oba") {
    parsedRef.verseFrom = parsedRef.chapterFrom;
    parsedRef.chapterFrom = 1;
    if (parsedRef.verseTo) {
      parsedRef.verseTo = parsedRef.chapterTo;
      parsedRef.chapterTo = 1;
    }
  }
  return parsedRef;
}
