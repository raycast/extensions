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
    // a trailing sentence without its final period still counts
    sentences: (s.match(/[^.!?…]*[\p{L}\p{N}][^.!?…]*(?:[.!?…]+|$)/gu) || []).length,
    paragraphs: s.split(/(?:\r?\n){2,}/).filter((p) => p.trim()).length,
    // 238 words a minute: the average silent reading speed for English non-fiction
    readSeconds: Math.round((words / 238) * 60),
    speakSeconds: Math.round((words / 150) * 60),
  };
}

export function words(s: string): string[] {
  return s
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2") // APIKey → API Key
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
  ẞ: "ss",
  æ: "ae",
  Æ: "ae",
  ø: "o",
  Ø: "o",
  đ: "d",
  Đ: "d",
  ł: "l",
  Ł: "l",
  œ: "oe",
  Œ: "oe",
  þ: "th",
  Þ: "th",
};

/** "Ölçü Birimi & Çeviri!" → "olcu-birimi-ceviri" */
export function slug(s: string): string {
  return s
    .replace(/[ıİşŞğĞçÇöÖüÜßẞæÆøØđĐłŁœŒþÞ]/g, (c) => FOLD[c])
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

// X weights text like twitter-text: Latin and common punctuation count 1, other scripts (CJK and more) 2,
// an emoji (with its modifiers and joiners) 2, and every link 23 whatever its length
const X_LIGHT = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
const URL_RE = /https?:\/\/\S+|\bwww\.\S+/giu;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

function xParts(s: string): { text: string; weight: number }[] {
  const out: { text: string; weight: number }[] = [];
  let last = 0;
  const plain = (t: string) => {
    for (const { segment } of graphemes.segment(t)) {
      if (EMOJI_RE.test(segment)) out.push({ text: segment, weight: 2 });
      else
        out.push({
          text: segment,
          weight: [...segment].reduce((n, c) => {
            const cp = c.codePointAt(0) ?? 0;
            return n + (X_LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2);
          }, 0),
        });
    }
  };
  for (const m of s.matchAll(URL_RE)) {
    plain(s.slice(last, m.index));
    out.push({ text: m[0], weight: 23 });
    last = m.index + m[0].length;
  }
  plain(s.slice(last));
  return out;
}

/** Length as X counts it toward the 280 limit */
export const xLength = (s: string) => xParts(s).reduce((n, p) => n + p.weight, 0);

/** The longest start of the text that fits the limit as X counts it */
export function xSlice(s: string, limit: number): string {
  let n = 0,
    out = "";
  for (const p of xParts(s)) {
    if ((n += p.weight) > limit) break;
    out += p.text;
  }
  return out;
}

export interface Limit {
  key: string;
  label: string;
  limit: number;
  used: number;
  left: number;
  /** the longest start of the text that fits */
  fit: string;
}

// Character limits of common fields; SEO values are the length search results show before cutting
export const LIMITS = [
  { key: "x-post", label: "X Post", limit: 280, x: true },
  { key: "instagram-caption", label: "Instagram Caption", limit: 2200 },
  { key: "tiktok-caption", label: "TikTok Caption", limit: 4000 },
  { key: "youtube-title", label: "YouTube Title", limit: 100 },
  { key: "youtube-description", label: "YouTube Description", limit: 5000 },
  { key: "linkedin-post", label: "LinkedIn Post", limit: 3000 },
  { key: "pinterest-description", label: "Pinterest Description", limit: 500 },
  { key: "seo-title", label: "SEO Title", limit: 60 },
  { key: "meta-description", label: "Meta Description", limit: 160 },
] as const;

/** How the text meets every limit, with X counted its own way */
export function limits(s: string): Limit[] {
  const chars = [...s],
    xLen = xLength(s);
  return LIMITS.map((l) => {
    const used = "x" in l ? xLen : chars.length;
    const fit = "x" in l ? xSlice(s, l.limit) : chars.slice(0, l.limit).join("");
    return { key: l.key, label: l.label, limit: l.limit, used, left: l.limit - used, fit };
  });
}

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
