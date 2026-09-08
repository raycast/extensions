import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback, slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * Fetch Chakra UI components by scraping the components overview page.
 * Component pages live at https://chakra-ui.com/docs/components/{slug}
 * and the overview page's sidebar links to all of them.
 *
 * Fallback: on any network error, non-OK response, or unparseable markup,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("chakra", scrape, buildFallback);
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(LIBRARY_URLS.chakra.overview);
  if (!res.ok) {
    throw new Error(`Failed to fetch Chakra UI: ${res.statusText}`);
  }
  const html = await res.text();

  // Sidebar links look like href="/docs/components/{slug}"
  const linkRegex = /\/docs\/components\/([a-z][a-z0-9-]*)/g;
  const slugs = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const slug = match[1];
    if (slug !== "concepts" && !NON_COMPONENT_SLUGS.has(slug)) {
      slugs.add(slug);
    }
  }

  // Too few results means the markup likely changed — treat as a parse failure.
  if (slugs.size <= 20) {
    throw new Error("Could not parse component list from Chakra UI");
  }

  return Array.from(slugs)
    .sort()
    .map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.chakra.components}/${slug}`,
      library: "chakra" as const,
    }));
}

function buildFallback(): UIComponent[] {
  return CHAKRA_COMPONENTS.map((slug) => ({
    name: toDisplayName(slug),
    slug,
    url: `${LIBRARY_URLS.chakra.components}/${slug}`,
    library: "chakra" as const,
  }));
}

/** Utility/provider pages under /docs/components that are NOT UI components */
const NON_COMPONENT_SLUGS = new Set([
  "client-only",
  "environment-provider",
  "locale-provider",
  "overlay-manager",
  "portal",
  "presence",
  "for",
  "show",
  "theme",
]);

/** Comprehensive static list of Chakra UI component slugs */
const CHAKRA_COMPONENTS = [
  "absolute-center",
  "accordion",
  "action-bar",
  "alert",
  "aspect-ratio",
  "avatar",
  "badge",
  "bleed",
  "blockquote",
  "box",
  "breadcrumb",
  "button",
  "card",
  "center",
  "checkbox",
  "checkbox-card",
  "checkmark",
  "clipboard",
  "close-button",
  "code",
  "collapsible",
  "color-picker",
  "color-swatch",
  "combobox",
  "container",
  "data-list",
  "dialog",
  "download-trigger",
  "drawer",
  "editable",
  "em",
  "empty-state",
  "field",
  "fieldset",
  "file-upload",
  "flex",
  "float",
  "format-byte",
  "format-number",
  "grid",
  "group",
  "heading",
  "highlight",
  "hover-card",
  "icon",
  "icon-button",
  "image",
  "input",
  "kbd",
  "link",
  "link-overlay",
  "list",
  "listbox",
  "mark",
  "menu",
  "native-select",
  "number-input",
  "pagination",
  "password-input",
  "pin-input",
  "popover",
  "progress",
  "progress-circle",
  "prose",
  "qr-code",
  "radio",
  "radio-card",
  "radiomark",
  "rating",
  "segmented-control",
  "select",
  "separator",
  "simple-grid",
  "skeleton",
  "skip-nav",
  "slider",
  "spinner",
  "stack",
  "stat",
  "status",
  "steps",
  "switch",
  "table",
  "tabs",
  "tag",
  "tags-input",
  "text",
  "textarea",
  "timeline",
  "toast",
  "toggle-tip",
  "tooltip",
  "tree-view",
  "visually-hidden",
  "wrap",
].sort();

export const chakraLibrary: UILibrary = {
  id: "chakra",
  name: "Chakra UI",
  icon: "chakra-icon.png",
  baseUrl: LIBRARY_URLS.chakra.base,
  fetchComponents,
};
