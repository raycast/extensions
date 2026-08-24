import { LIBRARY_URLS } from "../constants";
import { UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";

/** Convert a slug like "button-close" to "Button Close" */
function toDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Fetch Taiga UI components by parsing the sitemap.xml.
 * The sitemap contains URLs like https://taiga-ui.dev/components/{slug}/
 * We extract unique component slugs from these URLs.
 *
 * Fallback: if scraping fails, use a comprehensive static list.
 */
async function fetchComponents(): Promise<UIComponent[]> {
  const cached = getCached("taiga");
  if (cached) return cached;

  let components: UIComponent[] | null = null;

  try {
    const res = await fetch(LIBRARY_URLS.taiga.sitemap);
    if (res.ok) {
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

      if (slugs.size > 20) {
        components = Array.from(slugs)
          .sort()
          .map((slug) => ({
            name: toDisplayName(slug),
            slug,
            url: `${LIBRARY_URLS.taiga.components}/${slug}`,
            library: "taiga" as const,
          }));
      }
    }
  } catch {
    // Scraping failed, fall through to static list
  }

  // Fallback to static list if scraping didn't yield enough results
  if (!components || components.length === 0) {
    components = TAIGA_COMPONENTS.map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.taiga.components}/${slug}`,
      library: "taiga" as const,
    }));
  }

  setCache("taiga", components);
  return components;
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
