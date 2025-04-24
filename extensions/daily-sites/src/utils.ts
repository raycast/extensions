import { LocalStorage } from "@raycast/api";
import type { Site } from "./types";

const STORAGE_KEY = "sitesXml";

/**
 * Escape XML special characters in a string.
 */
function escapeXML(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case `"`:
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Serialize a list of sites into an XML string.
 * Omits <category> if the site is "uncategorized".
 */
export function sitesToXml(sites: Site[]): string {
  const body = sites
    .map((s) => {
      const lines = [`  <site>`, `    <name>${escapeXML(s.name)}</name>`, `    <url>${escapeXML(s.url)}</url>`];
      if (s.category && s.category !== "uncategorized") {
        lines.push(`    <category>${escapeXML(s.category)}</category>`);
      }
      lines.push(`  </site>`);
      return lines.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0"?>\n<sites>\n${body}\n</sites>`;
}

/**
 * Parse an XML string into an array of Site objects.
 * Blank or missing <category> yields "uncategorized".
 */
export function parseSitesXml(xml: string): Site[] {
  const siteBlocks = Array.from(xml.matchAll(/<site>([\s\S]*?)<\/site>/g));
  return siteBlocks.map((m) => {
    const block = m[1];
    const nameMatch = block.match(/<name>(.*?)<\/name>/s);
    const urlMatch = block.match(/<url>(.*?)<\/url>/s);
    const catMatch = block.match(/<category>(.*?)<\/category>/s);
    const name = nameMatch?.[1].trim() || "";
    const url = urlMatch?.[1].trim() || "";
    const categoryRaw = catMatch?.[1].trim() || "";
    const category = categoryRaw || "uncategorized";
    return { name, url, category };
  });
}

/**
 * Return a new array of sites sorted alphabetically by name.
 */
export function sortSites(sites: Site[]): Site[] {
  return sites.slice().sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract a sorted list of unique, non-empty categories from the sites.
 * Excludes "uncategorized".
 */
export function getCategories(sites: Site[]): string[] {
  return Array.from(new Set(sites.map((s) => s.category).filter((c) => c && c !== "uncategorized"))).sort();
}

/**
 * Load sites from LocalStorage, initializing to empty XML if needed.
 */
export async function loadSites(): Promise<Site[]> {
  // getItem<T>() returns Promise<T | null | undefined>, so coerce undefined → null
  const raw = (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? null;

  if (!raw || !raw.trim().startsWith("<?xml")) {
    const empty = `<?xml version="1.0"?><sites></sites>`;
    await LocalStorage.setItem(STORAGE_KEY, empty).catch(() => {});
    return [];
  }

  try {
    const parsed = parseSitesXml(raw);
    return sortSites(parsed);
  } catch (e) {
    console.error("loadSites: parse error", e);
    const empty = `<?xml version="1.0"?><sites></sites>`;
    await LocalStorage.setItem(STORAGE_KEY, empty).catch(() => {});
    return [];
  }
}

/**
 * Save a list of sites by serializing to XML and storing it.
 */
export async function saveSites(sites: Site[]): Promise<void> {
  const sorted = sortSites(sites);
  const xml = sitesToXml(sorted);
  await LocalStorage.setItem(STORAGE_KEY, xml);
}
