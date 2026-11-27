/**
 * The redbison.dev catalogue: every tool on the site, as the Search Tools
 * command lists it.
 *
 * A copy ships inside the extension (src/vendor/site-tools.json, built from
 * https://redbison.dev/ai-tools.json), so the list works
 * offline and on first launch. The command then fetches the live
 * https://redbison.dev/ai-tools.json, which gains tools every week, and keeps
 * the newer list in Raycast's cache. The request is a plain GET of a public
 * file and carries nothing about the user.
 */
import bundled from "../vendor/site-tools.json";

export const CATALOGUE_URL = "https://redbison.dev/ai-tools.json";

export type SiteTool = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  subcategory: string;
  guide?: string;
  keywords: string[];
};

export const BUNDLED_TOOLS: SiteTool[] = (bundled as { tools: SiteTool[] }).tools;

/**
 * The live catalogue reduced to the same shape, or an error if it is not one.
 *
 * Only https://redbison.dev links are kept: the list opens URLs in the
 * browser, so a malformed or tampered entry is dropped rather than opened.
 */
export function parseCatalogue(json: unknown): SiteTool[] {
  const tools = (json as { tools?: unknown })?.tools;
  if (!Array.isArray(tools)) throw new Error("The RedBison catalogue has no tool list.");
  const out: SiteTool[] = [];
  for (const raw of tools) {
    const t = raw as Partial<SiteTool>;
    if (typeof t?.id !== "string" || typeof t.name !== "string" || typeof t.url !== "string") continue;
    if (!isSiteUrl(t.url)) continue;
    out.push({
      id: t.id,
      name: t.name,
      description: typeof t.description === "string" ? t.description : "",
      url: t.url,
      category: typeof t.category === "string" ? t.category : "Other",
      subcategory: typeof t.subcategory === "string" ? t.subcategory : "",
      ...(typeof t.guide === "string" && isSiteUrl(t.guide) ? { guide: t.guide } : {}),
      keywords: Array.isArray(t.keywords) ? t.keywords.filter((k): k is string => typeof k === "string") : [],
    });
  }
  if (!out.length) throw new Error("The RedBison catalogue is empty.");
  return out;
}

export function isSiteUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "redbison.dev" || u.hostname.endsWith(".redbison.dev"));
  } catch {
    return false;
  }
}

/** Categories in the order the site lists them: by how many tools each holds. */
export function categoriesOf(tools: SiteTool[]): string[] {
  const counts = new Map<string, number>();
  for (const t of tools) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}

/** Search terms for a row: the site's own keywords plus the subcategory. */
export function searchKeywords(t: SiteTool): string[] {
  return [...new Set([...t.keywords, ...t.subcategory.toLowerCase().split(/[^a-z0-9]+/), t.id])].filter(Boolean);
}
