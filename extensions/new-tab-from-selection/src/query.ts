import { isUrl, normalizeUrl } from "./detectUrl";
import { buildTargetUrl } from "./searchEngines";
import type { ResolvedPrefs } from "./preferences";

/** Collapse all runs of whitespace (incl. newlines from multi-line selections)
 *  to single spaces and trim the ends. */
export function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Turn raw selected/clipboard/typed text into the URL to open, applying the
 * user's engine and URL-handling preferences.
 *
 * Returns `null` when there is no usable text, so the caller can show a HUD and
 * open nothing.
 */
export function resolveQueryToUrl(rawText: string | undefined, prefs: ResolvedPrefs): string | null {
  const text = normalizeText(rawText ?? "");
  if (!text) return null;

  if (prefs.openUrlsDirectly && isUrl(text)) {
    return normalizeUrl(text);
  }
  return buildTargetUrl(text, prefs.engine, prefs.customSearchUrl);
}
