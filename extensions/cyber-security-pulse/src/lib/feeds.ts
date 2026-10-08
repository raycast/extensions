export interface Feed {
  name: string;
  url: string;
}

// Curated cyber security sources. Used as the default value of the `feeds`
// preference and as the fallback when the preference is empty/invalid.
export const DEFAULT_FEEDS: Feed[] = [
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  {
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
  },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  {
    name: "CISA Alerts",
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
  },
  { name: "Schneier on Security", url: "https://www.schneier.com/feed/atom/" },
  { name: "SANS ISC", url: "https://isc.sans.edu/rssfeed_full.xml" },
];

// Only http(s) feed URLs are accepted.
function safeFeedUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.toString()
      : "";
  } catch {
    return "";
  }
}

// Parse the `feeds` preference: comma-separated entries, each "Name|url" or a
// bare "url" (name derived from the hostname). Invalid URLs are skipped, results
// deduped by URL. Falls back to DEFAULT_FEEDS when nothing valid parses.
export function parseFeeds(raw: string): Feed[] {
  const entries = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const feeds: Feed[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const parts = entry.split("|").map((s) => s.trim());
    const rawUrl = parts.length >= 2 ? parts[1] : parts[0];
    let name = parts.length >= 2 ? parts[0] : "";
    const url = safeFeedUrl(rawUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (!name) {
      try {
        name = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        name = url;
      }
    }
    feeds.push({ name, url });
  }
  return feeds.length > 0 ? feeds : DEFAULT_FEEDS;
}
