import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback, slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * Fetch Taiga UI components by parsing the sitemap.xml.
 * The sitemap contains URLs like https://taiga-ui.dev/components/{slug}/
 * We extract unique component slugs from these URLs.
 *
 * Fallback: on any network error, non-OK response, or unparseable markup,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("taiga", scrape, buildFallback);
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(LIBRARY_URLS.taiga.sitemap);
  if (!res.ok) {
    throw new Error(`Failed to fetch Taiga UI: ${res.statusText}`);
  }
  const xml = await res.text();

  // Extract component slugs from sitemap URLs like /components/{slug}/
  const locRegex = /<loc>https:\/\/taiga-ui\.dev\/components\/([a-z][a-z0-9-]*)\/<\/loc>/g;
  const slugs = new Set<string>();
  let match;

  while ((match = locRegex.exec(xml)) !== null) {
    const slug = match[1];
    // Filter out deprecated and legacy components
    if (!slug.endsWith("-deprecated") && !slug.endsWith("-old") && !slug.endsWith("-legacy")) {
      slugs.add(slug);
    }
  }

  if (slugs.size <= 20) {
    throw new Error("Could not parse component list from Taiga UI");
  }

  return Array.from(slugs)
    .sort()
    .map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.taiga.components}/${slug}`,
      library: "taiga" as const,
    }));
}

function buildFallback(): UIComponent[] {
  return TAIGA_COMPONENTS.map((slug) => ({
    name: toDisplayName(slug),
    slug,
    url: `${LIBRARY_URLS.taiga.components}/${slug}`,
    library: "taiga" as const,
  }));
}

/** Comprehensive static list of Taiga UI component slugs */
const TAIGA_COMPONENTS = [
  "accordion",
  "actions-bar",
  "alert",
  "avatar",
  "badge",
  "badge-notification",
  "badged-content",
  "block",
  "bottom-sheet",
  "button",
  "button-close",
  "button-group",
  "button-select",
  "calendar",
  "calendar-month",
  "calendar-range",
  "carousel",
  "checkbox",
  "chip",
  "combo-box",
  "comment",
  "compass",
  "confirm",
  "copy",
  "data-list",
  "data-list-wrapper",
  "dialog",
  "drawer",
  "elastic-container",
  "error",
  "expand",
  "filter",
  "floating-container",
  "group",
  "icon",
  "input",
  "input-card",
  "input-card-group",
  "input-chip",
  "input-color",
  "input-date",
  "input-date-multi",
  "input-date-range",
  "input-date-time",
  "input-files",
  "input-inline",
  "input-month",
  "input-number",
  "input-phone",
  "input-phone-international",
  "input-pin",
  "input-range",
  "input-slider",
  "input-tag",
  "input-time",
  "input-year",
  "island",
  "item-group",
  "items-with-more",
  "label",
  "like",
  "line-clamp",
  "link",
  "list",
  "loader",
  "message",
  "mobile-calendar",
  "mobile-dialog",
  "multi-select",
  "navigation",
  "notification",
  "notification-middle",
  "pager",
  "pdf-viewer",
  "pin",
  "preview",
  "primitive-textfield",
  "progress-bar",
  "progress-circle",
  "progress-segmented",
  "pull-to-refresh",
  "pulse",
  "push",
  "radio",
  "range",
  "rating",
  "reorder",
  "scrollbar",
  "search",
  "select",
  "sheet",
  "sheet-dialog",
  "slider",
  "slides",
  "status",
  "surface",
  "swipe-actions",
  "switch",
  "table",
  "table-filters",
  "table-pagination",
  "tag",
  "textarea",
  "textfield",
  "thumbnail-card",
  "tiles",
  "title",
  "toast",
  "tooltip",
  "tree",
].sort();

export const taigaLibrary: UILibrary = {
  id: "taiga",
  name: "Taiga UI",
  icon: "taiga-icon.png",
  baseUrl: LIBRARY_URLS.taiga.base,
  fetchComponents,
};
