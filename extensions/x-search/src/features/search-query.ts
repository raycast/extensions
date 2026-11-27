import { formatCalendarDay, nextCalendarDay } from "./calendar-day";
import { ANY_LANGUAGE } from "./languages";
import { type AdvancedSearchValues, type FilterMode } from "./search-form";
import { wholeNumberDigits } from "./whole-number";

const WORD_SEPARATOR = /\s+/;
const LIST_SEPARATOR = /[\s,]+/;
const LEADING_MINUSES = /^-+/;
const LEADING_HASH_MARKS = /^#+/;
const LEADING_AT_SIGNS = /^@+/;

function splitWords(text: string): string[] {
  return nonEmpty(text.split(WORD_SEPARATOR));
}

function splitList(text: string): string[] {
  return nonEmpty(text.split(LIST_SEPARATOR));
}

function stripLeading(words: string[], leadingMarks: RegExp): string[] {
  return nonEmpty(words.map((word) => word.replace(leadingMarks, "")));
}

function nonEmpty(parts: string[]): string[] {
  return parts.filter((part) => part !== "");
}

function orGroup(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `(${items.join(" OR ")})`;
}

function allWordsPart(text: string, hasOtherParts: boolean): string {
  const words = splitWords(text);
  const typed = words.join(" ");
  return hasOtherParts && words.includes("OR") ? `(${typed})` : typed;
}

function exactPhrasePart(text: string): string {
  const exact = text.replace(/"/g, "").trim();
  return exact === "" ? "" : `"${exact}"`;
}

function anyWordsPart(text: string): string {
  return orGroup(splitWords(text).filter((word) => word !== "OR"));
}

function noneWordsPart(text: string): string {
  return stripLeading(splitWords(text), LEADING_MINUSES)
    .map((word) => `-${word}`)
    .join(" ");
}

function hashtagsPart(text: string): string {
  return orGroup(stripLeading(splitList(text), LEADING_HASH_MARKS).map((tag) => `#${tag}`));
}

function accountsPart(text: string, writeAccount: (account: string) => string): string {
  return orGroup(stripLeading(splitList(text), LEADING_AT_SIGNS).map(writeAccount));
}

function minimumCountPart(operator: string, value: string): string {
  const digits = wholeNumberDigits(value);
  if (digits === null || digits === "0") return "";
  return `${operator}:${digits}`;
}

function languagePart(language: string): string {
  if (language === ANY_LANGUAGE) return "";
  return `lang:${language}`;
}

function sincePart(fromDate: Date | null | undefined): string {
  if (fromDate == null) return "";
  return `since:${formatCalendarDay(fromDate)}`;
}

/** X leaves out the until: day, so the day after To keeps posts from To itself. */
function untilPart(toDate: Date | null | undefined): string {
  if (toDate == null) return "";
  return `until:${formatCalendarDay(nextCalendarDay(toDate))}`;
}

function filterPart(name: string, mode: FilterMode): string {
  if (mode === "only") return `filter:${name}`;
  if (mode === "exclude") return `-filter:${name}`;
  return "";
}

export function writeSearchQuery(form: AdvancedSearchValues): string {
  const otherParts = nonEmpty([
    exactPhrasePart(form.exactPhrase),
    anyWordsPart(form.anyWords),
    noneWordsPart(form.noneWords),
    hashtagsPart(form.hashtags),
    accountsPart(form.fromAccounts, (account) => `from:${account}`),
    accountsPart(form.toAccounts, (account) => `to:${account}`),
    accountsPart(form.mentionedAccounts, (account) => `@${account}`),
    minimumCountPart("min_replies", form.minReplies),
    minimumCountPart("min_faves", form.minLikes),
    minimumCountPart("min_retweets", form.minReposts),
    languagePart(form.language),
    untilPart(form.toDate),
    sincePart(form.fromDate),
    filterPart("replies", form.replies),
    filterPart("links", form.links),
  ]);
  return nonEmpty([allWordsPart(form.allWords, otherParts.length > 0), ...otherParts]).join(" ");
}
