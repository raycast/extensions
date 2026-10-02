// Generated locally so that no item name or domain leaves the machine (unlike favicon services).
const AVATAR_COLORS = [
  "#D9534F",
  "#E8833A",
  "#C9A227",
  "#3FA66B",
  "#2A9D8F",
  "#3B82F6",
  "#7C5CD6",
  "#D45D9A",
  "#6B7280",
];

/** First letter or digit of a title, uppercased: "example.com" -> "E", "  42 Things" -> "4". */
export function initialOf(title: string): string {
  const match = title.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase() : "?";
}

function colorFor(title: string): string {
  let hash = 0;
  for (const char of title.toLowerCase()) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * A rounded square with the title's initial, as a base64 SVG data URI. Base64 avoids the parsing issues
 * of raw SVG in data URIs (e.g. "#" in colors being read as a URL fragment).
 */
export function getInitialIconDataUri(title: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${colorFor(title)}"/>` +
    `<text x="32" y="43" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" ` +
    `font-size="32" font-weight="600" fill="#FFFFFF">${escapeXml(initialOf(title))}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
