import { LIBRARY_URLS } from "../constants";
import { ProviderResult, UIComponent, UILibrary } from "../types";
import { fetchWithFallback, slugToTitle as toDisplayName } from "./provider-helpers";

/**
 * primeng.dev is client-rendered, so its component list is read from the
 * showcase sidebar menu data (structured JSON) on GitHub instead.
 *
 * Fallback: on any network error, non-OK response, or unparseable data,
 * the bundled static list is used and the result is marked as fallback.
 */
function fetchComponents(): Promise<ProviderResult> {
  return fetchWithFallback("primeng", scrape, buildFallback);
}

interface MenuNode {
  name?: string;
  routerLink?: string;
  children?: MenuNode[];
}

async function scrape(): Promise<UIComponent[]> {
  const res = await fetch(LIBRARY_URLS.primeng.menu);
  if (!res.ok) {
    throw new Error(`Failed to fetch PrimeNG: ${res.statusText}`);
  }
  const menu = (await res.json()) as { data?: MenuNode[] };

  // Only the "Components" top-level node holds actual component routes.
  const components = menu.data?.find((node) => node.name === "Components");
  const slugs = new Set<string>();
  collectSlugs(components?.children ?? [], slugs);

  if (slugs.size <= 20) {
    throw new Error("Could not parse component list from PrimeNG");
  }

  return Array.from(slugs)
    .sort()
    .map((slug) => ({
      name: toDisplayName(slug),
      slug,
      url: `${LIBRARY_URLS.primeng.base}/${slug}`,
      library: "primeng" as const,
    }));
}

/** Walk the menu tree, collecting single-segment routerLink slugs. */
function collectSlugs(nodes: MenuNode[], slugs: Set<string>): void {
  for (const node of nodes) {
    const link = node.routerLink;
    if (link) {
      const slug = link.replace(/^\//, "");
      if (/^[a-z][a-z0-9-]*$/.test(slug)) slugs.add(slug);
    }
    if (node.children) collectSlugs(node.children, slugs);
  }
}

function buildFallback(): UIComponent[] {
  return PRIMENG_COMPONENTS.map((slug) => ({
    name: toDisplayName(slug),
    slug,
    url: `${LIBRARY_URLS.primeng.base}/${slug}`,
    library: "primeng" as const,
  }));
}

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
