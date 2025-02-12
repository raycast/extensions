import { Preferences } from "./types";

import { getPreferenceValues } from "@raycast/api";

const {
  includeCopyright,
  includeFirstVerseNumbers,
  includeFootnotes,
  includeHeadings,
  includePassageReferences,
  includeSelahs,
  includeVerseNumbers,
  indentParagraphs,
  indentPoetry,
  indentUsing,
} = getPreferenceValues<Preferences>();

export const stylingOptions = {
  default: {
    title: "My Preferences",
    value: `&include-passage-references=${includePassageReferences}&include-verse-numbers=${includeVerseNumbers}&include-first-verse-numbers=${includeFirstVerseNumbers}&include-footnotes=${includeFootnotes}&include-footnotes=${includeFootnotes}&include-headings=${includeHeadings}&include-short-copyright=${
      includeCopyright === "short" ? "true" : "false"
    }&include-copyright=${
      includeCopyright === "full" ? "true" : "false"
    }&include-selahs=${includeSelahs}&indent-poetry=${indentPoetry}&indent-paragraphs=${
      indentParagraphs ? 2 : 0
    }&indent-using=${indentUsing}`,
    id: 0,
  },
  all: {
    title: "ESV Default",
    value: "",
    id: 1,
  },
  some: {
    title: "Some styling",
    value: "&include-footnotes=false&include-footnote-body=false&include-headings=false&indent-poetry=false",
    id: 2,
  },
  none: {
    title: "No styling",
    value:
      "&include-passage-references=false&include-verse-numbers=false&include-first-verse-numbers=false&include-footnotes=false&include-footnote-body=false&include-headings=false&include-short-copyright=false&include-copyright=false&include-selahs=false&include-passage-horizontal-lines=true&include-heading-horizontal-lines=true&indent-poetry=false&indent-poetry-lines=0&indent-psalm-doxology=0&indent-declares=0&indent-paragraphs=0",
    id: 3,
  },
};
