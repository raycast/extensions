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

/**
 * Fetch spartan/ui components by scraping the /components page HTML.
 * The page renders links like <a href="/components/{slug}"> which we
 * extract directly. This is resilient to the site's internal state
 * format changing (the previous "ng-state" JSON payload no longer
 * contains component data).
 *
 * Fallback: if scraping fails, use a comprehensive static list.
 */
async function fetchComponents(): Promise<UIComponent[]> {
  const cached = getCached("spartan");
  if (cached) return cached;

  let components: UIComponent[] | null = null;

  try {
    const res = await fetch(LIBRARY_URLS.spartan.components);
    if (res.ok) {
      const html = await res.text();

      // Extract component slugs from links like href="/components/{slug}"
      const hrefRegex = /href="\/components\/([a-z][a-z0-9-]*)"/g;
      const slugs = new Set<string>();
      let match;

      while ((match = hrefRegex.exec(html)) !== null) {
        slugs.add(match[1]);
      }

      if (slugs.size > 20) {
        components = Array.from(slugs)
          .sort()
          .map((slug) => ({
            name: toDisplayName(slug),
            slug,
            url: `${LIBRARY_URLS.spartan.components}/${slug}`,
            library: "spartan" as const,
          }));
      }
    }
  } catch {
    // Scraping failed, fall through to static list
  }

  // Fallback to static list if scraping didn't yield enough results
  if (!components || components.length === 0) {
    components = SPARTAN_COMPONENTS.map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.spartan.components}/${slug}`,
      library: "spartan" as const,
    }));
  }

  setCache("spartan", components);
  return components;
}

/** Comprehensive static list of spartan/ui component slugs */
const SPARTAN_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "attachment",
  "autocomplete",
  "avatar",
  "badge",
  "breadcrumb",
  "bubble",
  "button",
  "button-group",
  "calendar",
  "card",
  "carousel",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "data-table",
  "date-picker",
  "dialog",
  "drawer",
  "dropdown-menu",
  "empty",
  "field",
  "hover-card",
  "input",
  "input-group",
  "input-otp",
  "item",
  "kbd",
  "label",
  "marker",
  "menubar",
  "message",
  "native-select",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "sonner",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
];

export const spartanLibrary: UILibrary = {
  id: "spartan",
  name: "spartan/ui",
  icon: "spartan-icon.png",
  baseUrl: LIBRARY_URLS.spartan.base,
  fetchComponents,
};
