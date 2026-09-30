import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback, slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * material.angular.dev is client-rendered with no component links in its HTML,
 * so the component list is read from the docs `documentation-items.ts` registry
 * on GitHub instead.
 *
 * Fallback: on any network error, non-OK response, or unparseable data,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("material", scrape, buildFallback);
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(LIBRARY_URLS.material.docItems);
  if (!res.ok) {
    throw new Error(`Failed to fetch Angular Material: ${res.statusText}`);
  }
  const source = await res.text();

  // The registry groups items by section; only the [COMPONENTS] array holds
  // real components (the [CDK] section that follows is excluded).
  const componentsBlock = extractComponentsBlock(source);

  const idRegex = /id:\s*'([a-z][a-z0-9-]*)'/g;
  const slugs = new Set<string>();
  let match;
  while ((match = idRegex.exec(componentsBlock)) !== null) {
    slugs.add(match[1]);
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

/** Slice out the `[COMPONENTS]: [ ... ]` array, stopping at the next section. */
function extractComponentsBlock(source: string): string {
  const start = source.indexOf("[COMPONENTS]: [");
  if (start === -1) return "";
  const end = source.indexOf("[CDK]:", start);
  return end === -1 ? source.slice(start) : source.slice(start, end);
}

function buildFallback(): UIComponent[] {
  return MATERIAL_COMPONENTS.map((slug) => ({
    name: toDisplayName(slug),
    slug,
    url: `${LIBRARY_URLS.material.base}/components/${slug}/overview`,
    library: "material" as const,
  }));
}

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
