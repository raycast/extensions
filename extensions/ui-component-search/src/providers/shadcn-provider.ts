import fetch from "node-fetch";
import { LIBRARY_URLS } from "../constants";
import { UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";

/** Convert a slug like "alert-dialog" to "Alert Dialog" */
function toDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchComponents(): Promise<UIComponent[]> {
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

  setCache("shadcn", components);
  return components;
}

export const shadcnLibrary: UILibrary = {
  id: "shadcn",
  name: "shadcn/ui",
  icon: "shadcn-icon.png",
  baseUrl: LIBRARY_URLS.shadcn.base,
  fetchComponents,
};
