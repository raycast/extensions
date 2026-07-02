export const SUGGESTION_LIMIT = 10;

export const FIREFOX_APP_NAME = "Firefox";

export const SEARCH_ENGINE_URLS: Readonly<Record<string, string>> = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
};

export function resolveSearchEngineUrl(engine: string, customUrl: string): string {
  if (engine === "custom") {
    const trimmed = customUrl.trim();
    if (trimmed) return trimmed.endsWith("=") || trimmed.endsWith("/") ? trimmed : `${trimmed}?q=`;
  }
  return SEARCH_ENGINE_URLS[engine] ?? SEARCH_ENGINE_URLS["google"]!;
}

export const TRACKING_PARAM_DENYLIST: readonly string[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_eid",
  "mc_cid",
  "igshid",
  "ref",
  "ref_src",
  "ref_url",
  "exit_bouncer",
  "_ga",
];

export function buildMozPlacesQuery(term: string, limit: number): string {
  const escaped = term.replace(/'/g, "''");
  const likePattern = `'%${escaped}%'`;
  return [
    "SELECT url, title, frecency, visit_count",
    "FROM moz_places",
    `WHERE (url LIKE ${likePattern}`,
    `  OR LOWER(COALESCE(title, '')) LIKE LOWER(${likePattern}))`,
    "AND hidden = 0",
    "AND frecency > 0",
    "ORDER BY frecency DESC, visit_count DESC",
    `LIMIT ${limit}`,
  ].join(" ");
}
