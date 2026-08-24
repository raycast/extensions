import fetch from "node-fetch";
import { LIBRARY_URLS } from "../constants";
import { UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";

/** Convert a slug like "action-icon" to "Action Icon" */
function toDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Fetch Mantine components by parsing the sitemap.xml.
 * The sitemap contains URLs like https://mantine.dev/core/{slug}
 * We extract unique component slugs from these URLs.
 *
 * Fallback: if scraping fails, use a comprehensive static list.
 */
async function fetchComponents(): Promise<UIComponent[]> {
  const cached = getCached("mantine");
  if (cached) return cached;

  let components: UIComponent[] | null = null;

  try {
    const res = await fetch(LIBRARY_URLS.mantine.sitemap);
    if (res.ok) {
      const xml = await res.text();

      // Extract component slugs from sitemap URLs like /core/{slug}
      const locRegex = /<loc>https:\/\/mantine\.dev\/core\/([a-z][a-z0-9-]*)<\/loc>/g;
      const slugs = new Set<string>();
      let match;

      while ((match = locRegex.exec(xml)) !== null) {
        const slug = match[1];
        if (!NON_COMPONENT_SLUGS.has(slug)) {
          slugs.add(slug);
        }
      }

      if (slugs.size > 20) {
        components = Array.from(slugs)
          .sort()
          .map((slug) => ({
            name: toDisplayName(slug),
            slug,
            url: `${LIBRARY_URLS.mantine.components}/${slug}`,
            library: "mantine" as const,
          }));
      }
    }
  } catch {
    // Scraping failed, fall through to static list
  }

  // Fallback to static list if scraping didn't yield enough results
  if (!components || components.length === 0) {
    components = MANTINE_COMPONENTS.map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.mantine.components}/${slug}`,
      library: "mantine" as const,
    }));
  }

  setCache("mantine", components);
  return components;
}

/** Pages under /core that are NOT components */
const NON_COMPONENT_SLUGS = new Set(["package"]);

/** Comprehensive static list of Mantine core component slugs */
const MANTINE_COMPONENTS = [
  "accordion",
  "action-icon",
  "affix",
  "alert",
  "alpha-slider",
  "anchor",
  "angle-slider",
  "app-shell",
  "aspect-ratio",
  "autocomplete",
  "avatar",
  "background-image",
  "badge",
  "blockquote",
  "box",
  "breadcrumbs",
  "burger",
  "button",
  "card",
  "cascader",
  "center",
  "checkbox",
  "chip",
  "close-button",
  "code",
  "collapse",
  "color-input",
  "color-picker",
  "color-swatch",
  "combobox",
  "combobox-popover",
  "container",
  "copy-button",
  "data-list",
  "dialog",
  "divider",
  "drawer",
  "empty-state",
  "fieldset",
  "file-button",
  "file-input",
  "flex",
  "floating-indicator",
  "floating-window",
  "focus-trap",
  "grid",
  "group",
  "highlight",
  "hover-card",
  "hue-slider",
  "image",
  "indicator",
  "input",
  "json-input",
  "kbd",
  "list",
  "loader",
  "loading-overlay",
  "mark",
  "marquee",
  "mask-input",
  "menu",
  "menubar",
  "modal",
  "multi-select",
  "native-select",
  "nav-link",
  "notification",
  "number-formatter",
  "number-input",
  "overflow-list",
  "overlay",
  "pagination",
  "paper",
  "password-input",
  "pill",
  "pills-input",
  "pin-input",
  "popover",
  "portal",
  "progress",
  "radio",
  "range-slider",
  "rating",
  "ring-progress",
  "rolling-number",
  "scroll-area",
  "scroller",
  "segmented-control",
  "select",
  "semi-circle-progress",
  "simple-grid",
  "skeleton",
  "slider",
  "space",
  "splitter",
  "spoiler",
  "stack",
  "stepper",
  "switch",
  "table",
  "table-of-contents",
  "tabs",
  "tags-input",
  "text",
  "text-input",
  "textarea",
  "theme-icon",
  "timeline",
  "title",
  "tooltip",
  "transition",
  "tree",
  "tree-select",
  "typography",
  "unstyled-button",
  "visually-hidden",
].sort();

export const mantineLibrary: UILibrary = {
  id: "mantine",
  name: "Mantine",
  icon: "mantine-icon.png",
  baseUrl: LIBRARY_URLS.mantine.base,
  fetchComponents,
};
