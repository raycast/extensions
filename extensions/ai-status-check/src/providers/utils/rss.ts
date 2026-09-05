export interface RssItem {
  title: string;
  link?: string;
  guid?: string;
  description?: string;
  publishedAt?: string;
  categories: string[];
}

export function parseRssItems(xml: string): RssItem[] {
  if (!/<rss\b/i.test(xml)) throw new Error("Status feed was not RSS");

  return matches(xml, "item")
    .map((item) => ({
      title: tag(item, "title") ?? "",
      link: normalizeUrl(tag(item, "link")),
      guid: tag(item, "guid"),
      description: tag(item, "description"),
      publishedAt: tag(item, "pubDate"),
      categories: matches(item, "category").map(cleanXmlValue),
    }))
    .filter((item) => item.title.length > 0);
}

export function stripHtml(value: string): string {
  return decodeEntities(
    value
      .replaceAll(/<br\s*\/?\s*>/gi, "\n")
      .replaceAll(/<\/p>|<\/li>|<\/h\d>/gi, "\n")
      .replaceAll(/<[^>]+>/g, " ")
      .replaceAll(/[ \t]+/g, " ")
      .replaceAll(/\n\s+/g, "\n")
      .trim(),
  );
}

function tag(xml: string, name: string): string | undefined {
  const pattern = new RegExp(`<${escapePattern(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapePattern(name)}>`, "i");
  const value = pattern.exec(xml)?.[1];
  return value === undefined ? undefined : cleanXmlValue(value);
}

function matches(xml: string, name: string): string[] {
  const pattern = new RegExp(`<${escapePattern(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapePattern(name)}>`, "gi");
  return [...xml.matchAll(pattern)].map((match) => match[1] ?? "");
}

function cleanXmlValue(value: string): string {
  return decodeEntities(
    value
      .replace(/^\s*<!\[CDATA\[/, "")
      .replace(/\]\]>\s*$/, "")
      .trim(),
  );
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
    nbsp: " ",
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x")) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    return named[body.toLowerCase()] ?? entity;
  });
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
