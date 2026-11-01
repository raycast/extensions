// Text helpers from @gosavetool/text (https://www.gosavetool.com/character-counter): counts, case changes, slugs, limits.

const SMALL = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "so",
  "the",
  "to",
  "up",
  "yet",
  "via",
  "vs",
]);

export interface TextStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  /** reading time in seconds at 238 words a minute */
  readSeconds: number;
  /** speaking time in seconds at 150 words a minute */
  speakSeconds: number;
}

/** Words, characters, lines and reading time of a text */
export function stats(s: string): TextStats {
  const words = (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) || []).length;
  return {
    words,
    chars: [...s].length,
    charsNoSpaces: [...s.replace(/\s/g, "")].length,
    lines: s === "" ? 0 : s.split(/\r\n|\r|\n/).length,
    sentences: (s.match(/[^.!?…]+[.!?…]+/g) || []).length,
    paragraphs: s.split(/(?:\r?\n){2,}/).filter((p) => p.trim()).length,
    // 238 words a minute: the average silent reading speed for English non-fiction
    readSeconds: Math.round((words / 238) * 60),
    speakSeconds: Math.round((words / 150) * 60),
  };
}

export function words(s: string): string[] {
  return s
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export const upper = (s: string) => s.toLocaleUpperCase();
export const lower = (s: string) => s.toLocaleLowerCase();

export function title(s: string): string {
  let i = 0;
  return s.toLocaleLowerCase().replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (w, at: number) => {
    const first = i++ === 0,
      afterColon = /[:.!?]\s*$/.test(s.slice(0, at));
    return !first && !afterColon && SMALL.has(w) ? w : w.charAt(0).toLocaleUpperCase() + w.slice(1);
  });
}

export function sentence(s: string): string {
  return s
    .toLocaleLowerCase()
    .replace(/(^\s*|[.!?…]\s+)(\p{L})/gu, (m, a: string, b: string) => a + b.toLocaleUpperCase());
}

const FOLD: Record<string, string> = {
  ı: "i",
  İ: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ç: "c",
  Ç: "c",
  ö: "o",
  Ö: "o",
  ü: "u",
  Ü: "u",
  ß: "ss",
  æ: "ae",
  ø: "o",
  đ: "d",
  ł: "l",
};

/** "Ölçü Birimi & Çeviri!" → "olcu-birimi-ceviri" */
export function slug(s: string): string {
  return s
    .replace(/[ıİşŞğĞçÇöÖüÜßæøđł]/g, (c) => FOLD[c])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const camel = (s: string) =>
  words(s)
    .map((w, i) => (i ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join("");
export const pascal = (s: string) =>
  words(s)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
export const snake = (s: string) =>
  words(s)
    .map((w) => w.toLowerCase())
    .join("_");
export const constant = (s: string) =>
  words(s)
    .map((w) => w.toUpperCase())
    .join("_");
export const kebab = (s: string) =>
  words(s)
    .map((w) => w.toLowerCase())
    .join("-");

/** Trailing spaces, runs of spaces and more than one blank line in a row */
export function clean(s: string): string {
  const nl = s.includes("\r\n") ? "\r\n" : "\n";
  return s
    .split(/\r\n|\n/)
    .map((l) => l.replace(/[ \t]+$/, "").replace(/(\S)[ \t]{2,}/g, "$1 "))
    .join(nl)
    .replace(new RegExp("(" + nl + "){3,}", "g"), nl + nl);
}

// Character limits of common fields; SEO values are the length search results show before cutting
export const LIMITS = [
  { key: "x-post", label: "X Post", limit: 280 },
  { key: "instagram-caption", label: "Instagram Caption", limit: 2200 },
  { key: "tiktok-caption", label: "TikTok Caption", limit: 4000 },
  { key: "youtube-title", label: "YouTube Title", limit: 100 },
  { key: "youtube-description", label: "YouTube Description", limit: 5000 },
  { key: "linkedin-post", label: "LinkedIn Post", limit: 3000 },
  { key: "pinterest-description", label: "Pinterest Description", limit: 500 },
  { key: "seo-title", label: "SEO Title", limit: 60 },
  { key: "meta-description", label: "Meta Description", limit: 160 },
] as const;

export function duration(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60),
    r = sec % 60;
  return r ? `${m} min ${r} sec` : `${m} min`;
}

export const CASES = [
  { id: "upper", title: "UPPER CASE", fn: upper },
  { id: "lower", title: "lower case", fn: lower },
  { id: "title", title: "Title Case", fn: title },
  { id: "sentence", title: "Sentence case", fn: sentence },
  { id: "camel", title: "camelCase", fn: camel },
  { id: "pascal", title: "PascalCase", fn: pascal },
  { id: "snake", title: "snake_case", fn: snake },
  { id: "constant", title: "CONSTANT_CASE", fn: constant },
  { id: "kebab", title: "kebab-case", fn: kebab },
  { id: "slug", title: "URL Slug", fn: slug },
  { id: "clean", title: "Clean Extra Spaces", fn: clean },
] as const;
