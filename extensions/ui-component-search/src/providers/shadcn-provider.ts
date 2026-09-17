import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";
import { slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * shadcn/ui has no bundled static fallback, so a network error, non-OK
 * response, or parse failure rejects — surfacing the library as failed
 * (rather than silently degraded) in the UI.
 */
async function fetchComponents(): Promise<ProviderResult> {
  const cached = getCached("shadcn");
  if (cached) return cached;

  const res = await fetch(LIBRARY_URLS.shadcn.components);
  if (!res.ok) {
    throw new Error(`Failed to fetch shadcn/ui: ${res.statusText}`);
  }

  const html = await res.text();

  // shadcn/ui uses URLs like /docs/components/{category}/{slug}
  // where category is "radix", "base", etc.
  // We extract the full path and deduplicate by slug (preferring "radix" category)
  const linkRegex = /href="\/docs\/components\/([a-z]+)\/([a-z0-9-]+)"/g;
  const componentMap = new Map<string, { category: string; slug: string }>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const category = match[1];
    const slug = match[2];
    // Prefer "radix" over other categories if duplicate
    if (!componentMap.has(slug) || category === "radix") {
      componentMap.set(slug, { category, slug });
    }
  }

  if (componentMap.size === 0) {
    throw new Error("Could not parse component list from shadcn/ui");
  }

  const components: UIComponent[] = Array.from(componentMap.values())
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(({ category, slug }) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.shadcn.base}/docs/components/${category}/${slug}`,
      library: "shadcn" as const,
    }));

  setCache("shadcn", components, "live");
  return { components, source: "live" };
}

export const shadcnLibrary: UILibrary = {
  id: "shadcn",
  name: "shadcn/ui",
  icon: "shadcn-icon.png",
  baseUrl: LIBRARY_URLS.shadcn.base,
  fetchComponents,
};
