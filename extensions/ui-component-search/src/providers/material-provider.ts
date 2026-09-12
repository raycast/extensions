import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback, slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * Fetch Angular Material components by scraping the categories page.
 *
 * Fallback: on any network error, non-OK response, or unparseable markup,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("material", scrape, buildFallback);
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(LIBRARY_URLS.material.components);
  if (!res.ok) {
    throw new Error(`Failed to fetch Angular Material: ${res.statusText}`);
  }
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

  if (slugs.size <= 10) {
    throw new Error("Could not parse component list from Angular Material");
  }

  return Array.from(slugs)
    .sort()
    .map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.material.base}/components/${slug}/overview`,
      library: "material" as const,
    }));
}

function buildFallback(): UIComponent[] {
  return MATERIAL_COMPONENTS.map((slug) => ({
    name: toDisplayName(slug),
    slug,
    url: `${LIBRARY_URLS.material.base}/components/${slug}/overview`,
    library: "material" as const,
  }));
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
