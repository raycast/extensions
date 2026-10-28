import { Dictionaries } from "./dictionaries";

const ZWNJ = "\u200c";
const PERSIAN = "\\p{Script=Arabic}";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export interface CleanupOptions {
  /** می / نمی and ها / تر / ترین joined with a half-space. */
  halfSpace: boolean;
  /** , ; ? as ، ؛ ؟ next to Persian, no space before punctuation, «» quotes. */
  punctuation: boolean;
  /** 0-9 as ۰-۹ in Persian text. */
  digits: boolean;
  /** Repeated spaces collapsed, kashida (ـ) removed. */
  spaces: boolean;
}

export const ALL_CLEANUP: CleanupOptions = { halfSpace: true, punctuation: true, digits: true, spaces: true };

/** Suffixes that are always written with a half-space. */
const PLURAL_SUFFIXES = ["هایمان", "هایتان", "هایشان", "هایم", "هایت", "هایش", "هایی", "های", "ها"];
/** Suffixes that are also words on their own (تر is "wet"), so they're only joined when the result is a word. */
const COMPARATIVE_SUFFIXES = ["ترین", "تری", "تر"];

export function toPersianDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toLatinDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/**
 * Tidies Persian text the way a Persian copy editor would. Only touches text next to
 * Persian letters, so English words, URLs and numbers in English sentences are left alone.
 */
export function cleanUpPersian(text: string, options: CleanupOptions, dicts?: Dictionaries): string {
  let s = text.replaceAll("ي", "ی").replaceAll("ك", "ک");
  s = s.replace(/[٠-٩]/g, (d) => PERSIAN_DIGITS[ARABIC_DIGITS.indexOf(d)]);

  if (options.spaces) {
    s = s.replace(new RegExp(`(${PERSIAN})\u0640+`, "gu"), "$1");
    s = s.replace(/[^\S\n]{2,}/g, " ");
    s = s.replace(/[^\S\n]+$/gm, "");
  }

  if (options.halfSpace) {
    s = s.replace(new RegExp(`(^|[^\\p{L}\\u200c])(ن?می)[^\\S\\n]+(?=${PERSIAN}{2})`, "gu"), `$1$2${ZWNJ}`);
    for (const suffix of PLURAL_SUFFIXES) {
      s = s.replace(new RegExp(`(${PERSIAN}{2,})[^\\S\\n]+${suffix}(?![\\p{L}])`, "gu"), `$1${ZWNJ}${suffix}`);
    }
    for (const suffix of COMPARATIVE_SUFFIXES) {
      s = s.replace(new RegExp(`(${PERSIAN}{2,})[^\\S\\n]+${suffix}(?![\\p{L}])`, "gu"), (match, stem: string) =>
        dicts?.isWord(stem + suffix, "fa") ? `${stem}${ZWNJ}${suffix}` : match,
      );
    }
  }

  if (options.punctuation) {
    const marks: Record<string, string> = { ",": "،", ";": "؛", "?": "؟" };
    // Right after a Persian word (spaces before the mark are dropped); not inside numbers like ۱,۰۰۰.
    s = s.replace(new RegExp(`(${PERSIAN})[^\\S\\n]*([,;?])`, "gu"), (match, before: string, mark: string) =>
      /[۰-۹]/.test(before) ? match : before + marks[mark],
    );
    s = s.replace(new RegExp(`(${PERSIAN})[^\\S\\n]+([،؛؟!.:])(?=\\s|$)`, "gu"), "$1$2");
    s = s.replace(new RegExp(`([،؛؟])(?=${PERSIAN})`, "gu"), "$1 ");
    s = s.replace(new RegExp(`"([^"\\n]*${PERSIAN}[^"\\n]*)"`, "gu"), "«$1»");
  }

  if (options.digits) {
    // Numbers in a Persian sentence (a Persian word on the same line), but not inside URLs or English words.
    const persianLetter = new RegExp(`(?![۰-۹])${PERSIAN}`, "u");
    s = s
      .split("\n")
      .map((line) =>
        persianLetter.test(line)
          ? line
              .split(/(\s+)/)
              .map((token) => (/\p{Script=Latin}|:\/\/|[@/]/u.test(token) ? token : toPersianDigits(token)))
              .join("")
          : line,
      )
      .join("\n");
  }

  return s;
}
