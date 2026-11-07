import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas, IconDefinition, IconPack } from "@fortawesome/free-solid-svg-icons";
import { Icon, Image } from "@raycast/api";

/*
 * Font Awesome Free icons (CC BY 4.0) rendered as SVG data URIs, so any of the ~2,000 icons can be used without
 * shipping image assets. Icons are stored as `<prefix>:<name>`, e.g. `fas:database` or `fab:github`.
 */

export const DEFAULT_ICON = "fas:code";

export type IconStyle = "Solid" | "Regular" | "Brands";

export interface IconEntry {
  id: string;
  name: string;
  style: IconStyle;
  keywords: string[];
  definition: IconDefinition;
}

const PACKS: [IconPack, IconStyle][] = [
  [fas, "Solid"],
  [far, "Regular"],
  [fab, "Brands"],
];

const POPULAR = [
  "fas:code",
  "fas:bolt",
  "fas:database",
  "fas:server",
  "fas:terminal",
  "fas:magnifying-glass",
  "fas:list",
  "fas:table",
  "fas:user",
  "fas:users",
  "fas:user-gear",
  "fas:id-card",
  "fas:key",
  "fas:lock",
  "fas:shield-halved",
  "fas:fingerprint",
  "fas:cart-shopping",
  "fas:bag-shopping",
  "fas:credit-card",
  "fas:money-bill",
  "fas:receipt",
  "fas:store",
  "fas:box",
  "fas:truck",
  "fas:warehouse",
  "fas:building",
  "fas:envelope",
  "fas:message",
  "fas:comment",
  "fas:bell",
  "fas:phone",
  "fas:paper-plane",
  "fas:calendar",
  "fas:clock",
  "fas:chart-line",
  "fas:chart-bar",
  "fas:chart-pie",
  "fas:gear",
  "fas:wrench",
  "fas:bug",
  "fas:flask",
  "fas:rocket",
  "fas:cube",
  "fas:cubes",
  "fas:layer-group",
  "fas:sitemap",
  "fas:diagram-project",
  "fas:network-wired",
  "fas:plug",
  "fas:cloud",
  "fas:globe",
  "fas:link",
  "fas:file",
  "fas:folder",
  "fas:tag",
  "fas:bookmark",
  "fas:star",
  "fas:heart",
  "fas:flag",
  "fas:filter",
  "fas:arrows-rotate",
  "fas:download",
  "fas:upload",
  "fas:pen",
  "fas:trash",
  "fas:eye",
  "fas:robot",
  "fas:brain",
  "fas:wand-magic-sparkles",
  "fas:fire",
  "fas:house",
  "fab:github",
  "fab:gitlab",
  "fab:aws",
  "fab:google",
  "fab:microsoft",
  "fab:apple",
  "fab:slack",
  "fab:stripe",
  "fab:shopify",
  "fab:salesforce",
  "fab:docker",
  "fab:react",
  "fab:node-js",
];

let catalog: IconEntry[] | undefined;
let catalogById: Map<string, IconEntry> | undefined;

function getCatalog(): { list: IconEntry[]; byId: Map<string, IconEntry> } {
  if (!catalog || !catalogById) {
    const list: IconEntry[] = [];
    const byId = new Map<string, IconEntry>();
    for (const [pack, style] of PACKS) {
      // Packs contain one export per alias (faHome, faHouse, …) pointing to the same definition.
      for (const definition of Object.values(pack)) {
        const id = `${definition.prefix}:${definition.iconName}`;
        if (byId.has(id)) continue;
        const aliases = (definition.icon[2] as unknown[]).filter((alias): alias is string => typeof alias === "string");
        const entry: IconEntry = { id, name: definition.iconName, style, keywords: aliases, definition };
        byId.set(id, entry);
        list.push(entry);
      }
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    catalog = list;
    catalogById = byId;
  }
  return { list: catalog, byId: catalogById };
}

export function getIconEntry(id: string | undefined): IconEntry | undefined {
  return id ? getCatalog().byId.get(id) : undefined;
}

export function popularIcons(): IconEntry[] {
  return POPULAR.map((id) => getIconEntry(id)).filter((entry): entry is IconEntry => Boolean(entry));
}

/** Searches icon names and aliases; every word of the query has to match. */
export function searchIcons(text: string, limit = 120): IconEntry[] {
  const terms = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return popularIcons();

  const scored: { entry: IconEntry; score: number }[] = [];
  for (const entry of getCatalog().list) {
    let score = 0;
    for (const term of terms) {
      const termScore =
        entry.name === term
          ? 6
          : entry.keywords.includes(term)
            ? 5
            : entry.name.startsWith(term)
              ? 4
              : entry.keywords.some((keyword) => keyword.startsWith(term))
                ? 3
                : entry.name.includes(term)
                  ? 2
                  : entry.keywords.some((keyword) => keyword.includes(term)) || entry.style.toLowerCase() === term
                    ? 1
                    : 0;
      if (termScore === 0) {
        score = 0;
        break;
      }
      score += termScore;
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);
  return scored.slice(0, limit).map((item) => item.entry);
}

export const prettyIconName = (entry: IconEntry) =>
  entry.name.replace(/-/g, " ").replace(/^\w/, (char) => char.toUpperCase());

// Colors ----------------------------------------------------------------------------------------------------------

export interface IconColor {
  id: string;
  title: string;
  light: string;
  dark: string;
}

export const ICON_COLORS: IconColor[] = [
  { id: "default", title: "Default", light: "#262626", dark: "#EDEDED" },
  { id: "blue", title: "Blue", light: "#1F6FEB", dark: "#4C9BFF" },
  { id: "green", title: "Green", light: "#1A9F4B", dark: "#3DD068" },
  { id: "teal", title: "Teal", light: "#0E8F9C", dark: "#3FC8D6" },
  { id: "purple", title: "Purple", light: "#7E3FC4", dark: "#BF7AF2" },
  { id: "magenta", title: "Magenta", light: "#C42B7A", dark: "#FF5CB0" },
  { id: "red", title: "Red", light: "#D52F2F", dark: "#FF6159" },
  { id: "orange", title: "Orange", light: "#D96A00", dark: "#FFA23A" },
  { id: "yellow", title: "Yellow", light: "#B88A00", dark: "#FFD43B" },
  { id: "gray", title: "Gray", light: "#6B7280", dark: "#A1A7B0" },
];

export const getIconColor = (id: string | undefined) => ICON_COLORS.find((color) => color.id === id) ?? ICON_COLORS[0];

export function colorSwatch(color: IconColor): Image.ImageLike {
  return { source: Icon.CircleFilled, tintColor: { light: color.light, dark: color.dark } };
}

// Rendering -------------------------------------------------------------------------------------------------------

const svgCache = new Map<string, string>();

function svgDataUri(definition: IconDefinition, fill: string): string {
  const cacheKey = `${definition.prefix}:${definition.iconName}:${fill}`;
  const cached = svgCache.get(cacheKey);
  if (cached) return cached;

  const [width, height, , , pathData] = definition.icon;
  // Square viewBox with a little padding so wide icons don't look bigger than Raycast's built-in ones.
  const size = Math.max(width, height) * 1.12;
  const x = (width - size) / 2;
  const y = (height - size) / 2;
  const paths = (Array.isArray(pathData) ? pathData : [pathData]).map((d) => `<path fill="${fill}" d="${d}"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}" width="64" height="64">${paths.join("")}</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  svgCache.set(cacheKey, uri);
  return uri;
}

/** Theme-aware image for a Font Awesome icon id, falling back to the default icon. */
export function faIcon(id: string | undefined, colorId?: string): Image.ImageLike {
  const entry = getIconEntry(id) ?? getIconEntry(DEFAULT_ICON);
  if (!entry) return Icon.Code;
  const color = getIconColor(colorId);
  return {
    source: { light: svgDataUri(entry.definition, color.light), dark: svgDataUri(entry.definition, color.dark) },
  };
}
