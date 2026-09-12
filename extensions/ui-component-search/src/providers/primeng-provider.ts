import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback, slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * PrimeNG doesn't have a single components listing page.
 * We fetch the homepage and parse the embedded Angular app state
 * to extract the sidebar menu structure with all component routes.
 *
 * Fallback: on any network error, non-OK response, or unparseable markup,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("primeng", scrape, buildFallback);
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(`${LIBRARY_URLS.primeng.base}/installation`);
  if (!res.ok) {
    throw new Error(`Failed to fetch PrimeNG: ${res.statusText}`);
  }
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

  if (slugs.size <= 20) {
    throw new Error("Could not parse component list from PrimeNG");
  }

  return Array.from(slugs)
    .filter((slug) => !NON_COMPONENT_SLUGS.has(slug))
    .sort()
    .map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.primeng.base}/${slug}`,
      library: "primeng" as const,
    }));
}

function buildFallback(): UIComponent[] {
  return PRIMENG_COMPONENTS.map((slug) => ({
    name: toDisplayName(slug),
    slug,
    url: `${LIBRARY_URLS.primeng.base}/${slug}`,
    library: "primeng" as const,
  }));
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
