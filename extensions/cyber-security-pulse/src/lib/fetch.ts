import Parser from "rss-parser";
import { Feed } from "./feeds";
import { ExtraSignals, scoreItem } from "./score";
import { NewsItem, Severity } from "./types";

const parser = new Parser({ timeout: 10000 });

// Order tiers by criticality; within a tier, newest first (ADR-0010).
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function snippet(text: string, max = 400): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

// Only http(s) links may reach open/clipboard. Untrusted feeds could otherwise
// supply javascript:, file:, or data: URLs.
function safeUrl(raw: string): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.toString()
      : "";
  } catch {
    return "";
  }
}

const MAX_KEV_SCAN = 5000;

const KEV_TITLE = /known exploited vulnerab/i;
const KEV_ENTRY =
  /CVE-(\d{4})-(\d{3,7})\s+(.+?)(?=\s+CVE-\d{4}-\d{3,7}|\s+These types|\s+This type|\s+Binding Operational|$)/gi;

// CISA KEV items have a generic title; the affected products/CVEs live in the
// body. Rewrite the title with a few of them so the list row is scannable.
// Returns the original title when nothing parses.
function enrichKevTitle(title: string, body: string): string {
  if (!KEV_TITLE.test(title)) return title;
  const entries: string[] = [];
  for (const m of body.slice(0, MAX_KEV_SCAN).matchAll(KEV_ENTRY)) {
    const cve = `CVE-${m[1]}-${m[2]}`;
    const desc = m[3]
      .trim()
      .replace(/\s+(Vulnerabilities|Vulnerability)\.?$/i, "")
      .trim();
    entries.push(desc ? `${desc} (${cve})` : cve);
  }
  if (entries.length === 0) return title;
  const cap = 3;
  const shown = entries.slice(0, cap).join("; ");
  return entries.length > cap
    ? `CISA KEV: ${shown} +${entries.length - cap} more`
    : `CISA KEV: ${shown}`;
}

async function fetchFeed(
  name: string,
  url: string,
  extra?: ExtraSignals,
): Promise<NewsItem[]> {
  const feed = await parser.parseURL(url);
  return (feed.items ?? []).map((item) => {
    const rawTitle = (item.title ?? "Untitled").trim();
    const link = safeUrl((item.link ?? "").trim());
    const rawBody =
      item.contentSnippet ??
      item.content ??
      (item as { summary?: string }).summary ??
      "";
    const plain = toPlainText(rawBody);
    const title = enrichKevTitle(rawTitle, plain);
    const summary = snippet(plain);
    const publishedAt = item.isoDate ? Date.parse(item.isoDate) || 0 : 0;
    const { score, severity } = scoreItem(title, summary, extra);
    return { title, link, source: name, publishedAt, summary, score, severity };
  });
}

export async function fetchAllFeeds(
  feeds: Feed[],
  extra?: ExtraSignals,
): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    feeds.map((f) => fetchFeed(f.name, f.url, extra)),
  );

  const items: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
  }

  if (items.length === 0) {
    throw new Error("All feeds failed to load");
  }

  // Dedup by link (fall back to title when link missing).
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    const key = item.link || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      b.publishedAt - a.publishedAt,
  );
  return deduped;
}
