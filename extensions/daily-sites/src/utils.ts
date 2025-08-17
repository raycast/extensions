import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { parseStringPromise, Builder } from "xml2js";
import type { Site } from "./types";

const STORAGE_KEY = "sitesXml";

const XML_PARSE_OPTIONS = {
  explicitArray: false, // don’t wrap single items in arrays
  trim: true, // trim whitespace
};

/** Decode common HTML entities (named & numeric) */
export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Serialize a list of sites into an XML string.
 * Omits <category> if the site is "uncategorized".
 */
export function sitesToXml(sites: Site[]): string {
  // 1) build a plain JS structure that xml2js will turn into XML
  const payload = {
    site: sites.map((s) => {
      // only emit <category> if not 'uncategorized'
      const obj: Site = { name: s.name, url: s.url };
      if (s.category && s.category !== "uncategorized") {
        obj.category = s.category;
      }
      return obj;
    }),
  };

  // 2) configure a Builder with a root element <sites> and an XML decl
  const builder = new Builder({
    rootName: "sites",
    xmldec: { version: "1.0", encoding: "UTF-8" },
    renderOpts: { pretty: true, indent: "  ", newline: "\n" },
  });

  // 3) serialize and return
  return builder.buildObject(payload);
}

/**
 * Parse an XML string into an array of Site objects.
 * Blank or missing <category> yields "uncategorized".
 */
export async function parseSitesXml(xml: string): Promise<Site[]> {
  // 1) parse into a JS object
  const parsed = await parseStringPromise(xml, XML_PARSE_OPTIONS);

  // 2) find the <site> nodes (could be one or many)
  const raw = parsed.sites?.site;
  if (!raw) {
    return [];
  }
  const nodes = Array.isArray(raw) ? raw : [raw];

  // 3) map into your Site type, defaulting missing/empty category
  return nodes.map((node: Site) => ({
    name: node.name ?? "",
    url: node.url ?? "",
    category: node.category?.trim() || "uncategorized",
  }));
}

/**
 * Return a new array of sites sorted alphabetically by name.
 */
function sortSites(input: unknown): Site[] {
  if (!Array.isArray(input)) {
    return [];
  }
  // now we know it’s a Site[]
  return (input as Site[]).slice().sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract a sorted list of unique, non-empty categories from the sites.
 * Excludes "uncategorized".
 */
export function getCategories(sites: Site[]): string[] {
  return Array.from(
    new Set(sites.map((s) => s.category).filter((c): c is string => c !== undefined && c !== "uncategorized")),
  ).sort();
}

/**
 * Load sites from LocalStorage, initializing to empty XML if needed.
 */
export async function loadSites(): Promise<Site[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    // parseSitesXml always returns Site[], but might throw
    return await parseSitesXml(raw);
  } catch (error) {
    showFailureToast(error, { title: "Failed to load sites" });
    // reset storage to an empty list so next time it's clean
    await LocalStorage.setItem(STORAGE_KEY, sitesToXml([]));
    return [];
  }
}

/**
 * Save a list of sites by serializing to XML and storing it.
 */
export async function saveSites(sites: Site[]): Promise<void> {
  const sorted = sortSites(sites);
  const xml = sitesToXml(sorted);
  try {
    await LocalStorage.setItem(STORAGE_KEY, xml);
  } catch (error) {
    showFailureToast(error, { title: "Failed to save sites" });
  }
}
