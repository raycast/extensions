/**
 * Search-engine registry. Each engine is a URL template containing the literal
 * token `{query}`, which is replaced with the URL-encoded search text.
 *
 * The package.json `preferences.engine` dropdown is the source of truth for the
 * set of ids the user can pick; keep the two in sync.
 */

export type EngineId = "duckduckgo" | "google" | "brave" | "bing" | "kagi" | "startpage" | "custom";

export const QUERY_TOKEN = "{query}";

export const DEFAULT_ENGINE: Exclude<EngineId, "custom"> = "duckduckgo";

const TEMPLATES: Record<Exclude<EngineId, "custom">, string> = {
  duckduckgo: "https://duckduckgo.com/?q={query}",
  google: "https://www.google.com/search?q={query}",
  brave: "https://search.brave.com/search?q={query}",
  bing: "https://www.bing.com/search?q={query}",
  kagi: "https://kagi.com/search?q={query}",
  startpage: "https://www.startpage.com/sp/search?query={query}",
};

/**
 * All valid engine ids, derived from the single template source (plus `custom`)
 * so the set can't drift out of sync with `TEMPLATES`. Used to validate the
 * saved preference in `preferences.ts`.
 */
export const ENGINE_IDS: EngineId[] = [...(Object.keys(TEMPLATES) as Exclude<EngineId, "custom">[]), "custom"];

/**
 * Resolve the template for an engine. For `custom`, use the caller-supplied
 * template only when it is a well-formed absolute http(s) URL containing
 * `{query}`; otherwise fall back to the default engine's template so a blank or
 * schemeless custom field never produces a non-openable target.
 */
export function resolveTemplate(engine: EngineId, customTemplate?: string): string {
  if (engine === "custom") {
    const trimmed = (customTemplate ?? "").trim();
    if (trimmed.includes(QUERY_TOKEN) && /^https?:\/\//i.test(trimmed)) return trimmed;
    return TEMPLATES[DEFAULT_ENGINE];
  }
  return TEMPLATES[engine] ?? TEMPLATES[DEFAULT_ENGINE];
}

/**
 * Build the full search URL for a query. The query is URL-encoded and
 * substituted for every occurrence of `{query}` in the template.
 */
export function buildTargetUrl(query: string, engine: EngineId, customTemplate?: string): string {
  const template = resolveTemplate(engine, customTemplate);
  const encoded = encodeURIComponent(query);
  return template.split(QUERY_TOKEN).join(encoded);
}
