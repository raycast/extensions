import { parseHTML } from "linkedom";
import { id, linkSchema, type SavedLink, type Destination } from "./model";
export function normalizeURL(raw: string) {
  const url = new URL(raw.trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Use an HTTP or HTTPS URL without embedded credentials.");
  return url.href;
}
export function importLinks(text: string, collectionId: string): SavedLink[] {
  const now = new Date().toISOString();
  let rows: Array<{ url: string; title: string; description?: string; tags?: string[] }> = [];
  if (text.trim().startsWith("[") || text.trim().startsWith("{")) {
    const parsed = JSON.parse(text);
    const raw = Array.isArray(parsed) ? parsed : parsed.links;
    if (!Array.isArray(raw)) throw new Error("Expected a JSON array or an object containing links.");
    rows = raw;
  } else {
    const { document } = parseHTML(text);
    rows = Array.from(document.querySelectorAll("a")).map((a) => ({
      url: a.getAttribute(a.getAttributeNames().find((name) => name.toLowerCase() === "href") ?? "href") ?? "",
      title: a.textContent ?? "",
    }));
  }
  if (rows.length > 10000) throw new Error("Import at most 10,000 links at once.");
  const seen = new Set<string>();
  const result: SavedLink[] = [];
  for (const row of rows) {
    let url: string;
    try {
      url = normalizeURL(row.url);
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    result.push(
      linkSchema.parse({
        id: id(),
        url,
        title: (row.title || new URL(url).hostname).slice(0, 200),
        description: row.description ?? "",
        tags: row.tags ?? [],
        collectionId,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
  if (!result.length) throw new Error("No valid HTTP or HTTPS bookmarks found.");
  return result;
}
export function searchLinks(links: SavedLink[], query: string, destinations: Destination[]) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return links.filter((l) => {
    const hay = [
      l.title,
      l.url,
      l.description,
      l.tags.join(" "),
      destinations.find((d) => d.id === l.collectionId)?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
