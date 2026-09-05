import { LIBRARY_URLS } from "../constants";
import { UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";

/** Convert a slug like "button-toggle" to "Button Toggle" */
function toDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchComponents(): Promise<UIComponent[]> {
  const cached = getCached("material");
  if (cached) return cached;

  let components: UIComponent[] | null = null;

  try {
    const res = await fetch(LIBRARY_URLS.material.components);
    if (res.ok) {
      const html = await res.text();

      // Angular Material site embeds component data. Look for links to /components/{slug}
      const linkRegex = /\/components\/([a-z][a-z0-9-]*)/g;
      const slugs = new Set<string>();
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const slug = match[1];
        // Filter out non-component paths like "categories", "overview", "api", "examples"
        if (!NON_COMPONENT_SLUGS.has(slug)) {
          slugs.add(slug);
        }
      }

      if (slugs.size > 10) {
        components = Array.from(slugs)
          .sort()
          .map((slug) => ({
            name: toDisplayName(slug),
            slug,
            url: `${LIBRARY_URLS.material.base}/components/${slug}/overview`,
            library: "material" as const,
          }));
      }
    }
  } catch {
    // Scraping failed, fall through to static list
  }

  if (!components || components.length === 0) {
    components = MATERIAL_COMPONENTS.map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.material.base}/components/${slug}/overview`,
      library: "material" as const,
    }));
  }

  setCache("material", components);
  return components;
}

/** Paths under /components/ that are NOT actual components */
const NON_COMPONENT_SLUGS = new Set(["categories", "overview", "api", "examples", "styling"]);

/** Comprehensive static list of Angular Material component slugs */
const MATERIAL_COMPONENTS = [
  "autocomplete",
  "badge",
  "bottom-sheet",
  "button",
  "button-toggle",
  "card",
  "checkbox",
  "chips",
  "datepicker",
  "dialog",
  "divider",
  "expansion",
  "form-field",
  "grid-list",
  "icon",
  "input",
  "list",
  "menu",
  "paginator",
  "progress-bar",
  "progress-spinner",
  "radio",
  "ripple",
  "select",
  "sidenav",
  "slide-toggle",
  "slider",
  "snack-bar",
  "sort",
  "stepper",
  "table",
  "tabs",
  "timepicker",
  "toolbar",
  "tooltip",
  "tree",
].sort();

export const materialLibrary: UILibrary = {
  id: "material",
  name: "Angular Material",
  icon: "material-icon.png",
  baseUrl: LIBRARY_URLS.material.base,
  fetchComponents,
};
