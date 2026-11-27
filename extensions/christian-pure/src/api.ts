export const SITE = "https://christianpure.com";
export const APP_API = `${SITE}/wp-json/christianpure-app/v1`;

export interface Today {
  date: string;
  verse: { ref: string; text: string; translation: string; reflection?: string; articleId?: number };
  prayer: { title: string; text: string; articleId?: number; source?: string };
}

export interface Feeling {
  key: string;
  label: string;
}

export interface FeelingVerse {
  id: string;
  feeling: string;
  ref: string;
  text: string;
  articleId?: number;
}

export interface Occasion {
  key: string;
  label: string;
  moments: { key: string; label: string }[];
}

export interface ShortPrayer {
  id: number;
  occasion: string;
  moment: string;
  length: string;
  text: string;
  source: string;
  url: string;
}

export interface PrayersAloud {
  occasions: Occasion[];
  lengths: { key: string; long: string }[];
  pieces: ShortPrayer[];
}

export interface Article {
  url: string;
  title: string;
}

/** Adds utm_source=raycast&utm_medium=plugin to a christianpure.com link. */
export function trackedLink(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "raycast");
  u.searchParams.set("utm_medium", "plugin");
  return u.toString();
}

export function articleUrl(id?: number): string {
  return `${APP_API}/articles/${id ?? 0}`;
}

const SHORT: Record<string, string> = { "Berean Standard Bible": "BSB" };

export function shortTranslation(t: string): string {
  return SHORT[t] ?? t;
}

/** Turns the HTML entities WordPress leaves in titles (&#8217; and the like) into plain characters. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** "Bible study: opening prayer", or "Prayer before a meal" for moments named Before and After. */
export function prayerTitle(occasion: string, moment: string): string {
  const m = moment.toLowerCase();
  return m === "before" || m === "after" ? `Prayer ${m} a ${occasion.toLowerCase()}` : `${occasion}: ${m} prayer`;
}

/** The verse as plain text, ready to paste anywhere. */
export function verseText(text: string, ref: string, translation: string): string {
  return `${text}\n— ${ref} (${shortTranslation(translation)})`;
}

/** Keeps a prayer's paragraphs apart, with single line breaks inside a paragraph joined up. */
export function prayerParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Markdown blockquote for the detail view. */
export function quoteMarkdown(text: string): string {
  return text
    .split("\n")
    .map((l) => (l ? `> ${l}` : ">"))
    .join("\n");
}
