// Pure URL builders + parsers — no @raycast/api import, so they're unit-testable
// outside the Raycast runtime (see scripts/check-urls.mjs). This is the billing /
// binding correctness path: result/answer URLs cost money, and the {Query} placeholder
// is what makes Quicklink aliases/hotkeys work, so it must survive un-encoded.

const KAGI = "https://kagi.com";

// ---- Autosuggest (free, no auth) ---------------------------------------------

export function autosuggestUrl(q: string): string {
  return `${KAGI}/api/autosuggest?q=${encodeURIComponent(q)}`;
}

/** OpenSearch shape: ["query", ["s1", "s2", ...]]. */
export function parseSuggestions(json: unknown): string[] {
  return Array.isArray(json) && Array.isArray(json[1]) ? (json[1] as string[]) : [];
}

// ---- Search page + bangs (free web URLs) -------------------------------------

export function searchPageUrl(query: string): string {
  return `${KAGI}/search?q=${encodeURIComponent(query)}`;
}

export function bangSearchUrl(trigger: string, query: string): string {
  const t = trigger.startsWith("!") ? trigger : `!${trigger}`;
  return `${KAGI}/search?q=${encodeURIComponent(`${t} ${query}`.trim())}`;
}

/** Quicklink template: keeps the {Query} placeholder un-encoded so Raycast can substitute it. */
export function bangQuicklink(trigger: string): string {
  const t = trigger.startsWith("!") ? trigger.slice(1) : trigger;
  return `${KAGI}/search?q=!${t} {Query}`;
}

// ---- Translate (free web URLs) -----------------------------------------------

export interface TranslateOpts {
  from?: string;
  to?: string;
  quality?: string;
  style?: string;
  formality?: string;
}

function translateParams(o: TranslateOpts): string {
  const p = new URLSearchParams();
  if (o.from) p.set("from", o.from);
  if (o.to) p.set("to", o.to);
  if (o.quality && o.quality !== "standard") p.set("quality", o.quality);
  if (o.style && o.style !== "natural") p.set("style", o.style);
  if (o.formality && o.formality !== "default") p.set("formality", o.formality);
  return p.toString();
}

export function translateUrl(text: string, o: TranslateOpts): string {
  const base = translateParams(o);
  return `https://translate.kagi.com/?${base ? base + "&" : ""}text=${encodeURIComponent(text)}`;
}

export function translateQuicklink(o: TranslateOpts): string {
  const base = translateParams(o);
  return `https://translate.kagi.com/?${base ? base + "&" : ""}text={Query}`;
}

// ---- Summarizer (free web URLs) ----------------------------------------------

export interface SummaryOpts {
  summary?: string;
  target_language?: string;
}

function summaryParams(o: SummaryOpts): string {
  const p = new URLSearchParams();
  if (o.summary && o.summary !== "summary") p.set("summary", o.summary);
  if (o.target_language) p.set("target_language", o.target_language);
  return p.toString();
}

export function summarizeUrl(url: string, o: SummaryOpts): string {
  const extra = summaryParams(o);
  return `${KAGI}/summarizer/?url=${encodeURIComponent(url)}${extra ? "&" + extra : ""}`;
}

export function summarizeQuicklink(o: SummaryOpts): string {
  const extra = summaryParams(o);
  return `${KAGI}/summarizer/?url={Query}${extra ? "&" + extra : ""}`;
}

// ---- text helpers ------------------------------------------------------------

export function stripTags(s = ""): string {
  return s.replace(/<[^>]*>/g, "");
}

export function snippetToMarkdown(s = ""): string {
  return s
    .replace(/<b>/gi, "**")
    .replace(/<\/b>/gi, "**")
    .replace(/<[^>]*>/g, "");
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
