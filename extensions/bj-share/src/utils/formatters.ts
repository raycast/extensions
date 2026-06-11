import {
  TORRENT_SPECS_REGEX,
  BRACKETS_CONTENT_REGEX,
  INTERNAL_TAG_REGEX,
  TRAILING_DASH_REGEX,
  FREE_TAG_CLEANUP_REGEX,
} from "./constants";

export function unescapeHTML(str: string): string {
  if (!str) return "";
  const htmlEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
  };
  return str.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (match) => htmlEntities[match]);
}

export function formatFullDate(dateString?: string) {
  if (!dateString) return "Unknown Date";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function parseTorrentTitle(rawTitle: string) {
  const decoded = unescapeHTML(rawTitle);
  const match = decoded.match(TORRENT_SPECS_REGEX);

  let cleanTitle = decoded;
  let specs = "";

  if (match && match.index !== undefined) {
    cleanTitle = decoded.substring(0, match.index).trim();
    const specsMatches = decoded.substring(match.index).match(BRACKETS_CONTENT_REGEX) || [];
    specs = specsMatches
      .map((b) => b.replace(/\[|\]/g, "").trim())
      .filter((s) => s.length > 0)
      .join(" • ");
  }

  cleanTitle = cleanTitle.replace(INTERNAL_TAG_REGEX, "").replace(TRAILING_DASH_REGEX, "").trim();

  specs = specs
    .replace(FREE_TAG_CLEANUP_REGEX, "")
    .replace(/•\s*•/g, "•") // Remove double bullets if any
    .replace(/^•\s*|\s*•$/g, "") // Remove trailing/leading bullets
    .trim();

  return { cleanTitle, specs };
}
