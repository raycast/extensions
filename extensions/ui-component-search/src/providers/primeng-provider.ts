import fetch from "node-fetch";
import { LIBRARY_URLS } from "../constants";
import { UIComponent, UILibrary } from "../types";
import { getCached, setCache } from "../utils/cache";

/** Convert a slug like "autocomplete" to "AutoComplete" using PrimeNG conventions */
function toDisplayName(slug: string): string {
  // PrimeNG uses PascalCase-ish names; we'll title-case each word
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * PrimeNG doesn't have a single components listing page.
 * We fetch the homepage and parse the embedded Angular app state
 * to extract the sidebar menu structure with all component routes.
 *
 * Fallback: if scraping fails, use a comprehensive static list.
 */
async function fetchComponents(): Promise<UIComponent[]> {
  const cached = getCached("primeng");
  if (cached) return cached;

  let components: UIComponent[] | null = null;

  try {
    // Try to scrape from the PrimeNG site
    const res = await fetch(`${LIBRARY_URLS.primeng.base}/installation`);
    if (res.ok) {
      const html = await res.text();

      // PrimeNG's Angular app embeds route data. Look for component links in the HTML.
      // The sidebar contains links like href="/autocomplete", href="/accordion", etc.
      const linkRegex = /routerLink="\/([a-z][a-z0-9-]*)"/gi;
      const slugs = new Set<string>();
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        slugs.add(match[1].toLowerCase());
      }

      // Also try href patterns
      const hrefRegex = /href="\/([a-z][a-z0-9-]*)"/gi;
      while ((match = hrefRegex.exec(html)) !== null) {
        const slug = match[1].toLowerCase();
        // Filter out non-component pages
        if (!NON_COMPONENT_SLUGS.has(slug)) {
          slugs.add(slug);
        }
      }

      if (slugs.size > 20) {
        // We got a reasonable number of components from scraping
        components = Array.from(slugs)
          .filter((slug) => !NON_COMPONENT_SLUGS.has(slug))
          .sort()
          .map((slug) => ({
            name: toDisplayName(slug),
            slug,
            url: `${LIBRARY_URLS.primeng.base}/${slug}`,
            library: "primeng" as const,
          }));
      }
    }
  } catch {
    // Scraping failed, fall through to static list
  }

  // Fallback to static list if scraping didn't yield enough results
  if (!components || components.length === 0) {
    components = PRIMENG_COMPONENTS.map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.primeng.base}/${slug}`,
      library: "primeng" as const,
    }));
  }

  setCache("primeng", components);
  return components;
}

/** Pages that are NOT components */
const NON_COMPONENT_SLUGS = new Set([
  "installation",
  "configuration",
  "playground",
  "theming",
  "colors",
  "dark-mode",
  "icons",
  "csslayer",
  "passthrough",
  "locale",
  "accessibility",
  "support",
  "lts",
  "roadmap",
  "guides",
  "migration",
  "templates",
  "resources",
  "team",
  "contribution",
  "changelog",
]);

/** Comprehensive static list of PrimeNG component slugs */
const PRIMENG_COMPONENTS = [
  "accordion",
  "autocomplete",
  "avatar",
  "badge",
  "blockui",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "carousel",
  "cascadeselect",
  "chart",
  "checkbox",
  "chip",
  "chips",
  "colorpicker",
  "confirmdialog",
  "confirmpopup",
  "contextmenu",
  "dataview",
  "datepicker",
  "defer",
  "dialog",
  "divider",
  "dock",
  "drawer",
  "dropdown",
  "dynamicdialog",
  "editor",
  "fieldset",
  "fileupload",
  "floatlabel",
  "focustrap",
  "galleria",
  "iconfield",
  "iftalabel",
  "image",
  "imagecompare",
  "inplace",
  "inputgroup",
  "inputmask",
  "inputnumber",
  "inputotp",
  "inputswitch",
  "inputtext",
  "inputtextarea",
  "keyfilter",
  "knob",
  "listbox",
  "megamenu",
  "menu",
  "menubar",
  "message",
  "metergroup",
  "multiselect",
  "orderlist",
  "organizationchart",
  "paginator",
  "panel",
  "panelmenu",
  "password",
  "picklist",
  "popover",
  "progressbar",
  "progressspinner",
  "radiobutton",
  "rating",
  "ripple",
  "scrollpanel",
  "scrolltop",
  "select",
  "selectbutton",
  "skeleton",
  "slider",
  "speeddial",
  "splitbutton",
  "splitter",
  "stepper",
  "steps",
  "styleclass",
  "table",
  "tabmenu",
  "tabs",
  "tabview",
  "tag",
  "terminal",
  "textarea",
  "tieredmenu",
  "timeline",
  "toast",
  "togglebutton",
  "toggleswitch",
  "toolbar",
  "tooltip",
  "tree",
  "treeselect",
  "treetable",
  "virtualscroller",
].sort();

export const primengLibrary: UILibrary = {
  id: "primeng",
  name: "PrimeNG",
  icon: "primeng-icon.png",
  baseUrl: LIBRARY_URLS.primeng.base,
  fetchComponents,
};
