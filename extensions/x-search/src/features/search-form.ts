import { parseCalendarDay } from "./calendar-day";
import { ANY_LANGUAGE } from "./languages";
import { wholeNumberDigits } from "./whole-number";

export const FILTER_MODES = ["include", "only", "exclude"] as const;

export type FilterMode = (typeof FILTER_MODES)[number];

export type AdvancedSearchValues = {
  allWords: string;
  exactPhrase: string;
  anyWords: string;
  noneWords: string;
  hashtags: string;
  language: string;
  fromAccounts: string;
  toAccounts: string;
  mentionedAccounts: string;
  replies: FilterMode;
  links: FilterMode;
  minReplies: string;
  minLikes: string;
  minReposts: string;
  fromDate: Date | null | undefined;
  toDate: Date | null | undefined;
};

export type AdvancedSearchDraft = Partial<Record<keyof AdvancedSearchValues, unknown>>;

function draftText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseDraftDay(value: unknown): Date | null {
  if (typeof value === "string") return parseCalendarDay(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return null;
}

function isFilterMode(value: unknown): value is FilterMode {
  return FILTER_MODES.some((mode) => mode === value);
}

export function parseFilterMode(value: unknown): FilterMode {
  return isFilterMode(value) ? value : "include";
}

export function restoreForm(draft: AdvancedSearchDraft = {}): AdvancedSearchValues {
  return {
    allWords: draftText(draft.allWords),
    exactPhrase: draftText(draft.exactPhrase),
    anyWords: draftText(draft.anyWords),
    noneWords: draftText(draft.noneWords),
    hashtags: draftText(draft.hashtags),
    language: draftText(draft.language, ANY_LANGUAGE),
    fromAccounts: draftText(draft.fromAccounts),
    toAccounts: draftText(draft.toAccounts),
    mentionedAccounts: draftText(draft.mentionedAccounts),
    replies: parseFilterMode(draft.replies),
    links: parseFilterMode(draft.links),
    minReplies: draftText(draft.minReplies),
    minLikes: draftText(draft.minLikes),
    minReposts: draftText(draft.minReposts),
    fromDate: parseDraftDay(draft.fromDate),
    toDate: parseDraftDay(draft.toDate),
  };
}

export function validateWholeNumber(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (wholeNumberDigits(value) === null) return "Use a whole number";
  return undefined;
}

function startOfCalendarDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isFromDateAfterToDate(fromDate: Date | null | undefined, toDate: Date | null | undefined): boolean {
  if (fromDate == null || toDate == null) return false;
  return startOfCalendarDay(fromDate) > startOfCalendarDay(toDate);
}
