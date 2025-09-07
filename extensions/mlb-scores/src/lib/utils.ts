import { Stat } from "../interfaces/playerDetails";

/**
 * Convert simple HTML to Markdown for Raycast Detail/List markdown.
 */
export function convertHtmlToMarkdown(html: string): string {
  if (!html) return "";

  let markdown = html
    // Replace paragraph tags
    .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
    // Replace strong/bold tags
    .replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, "**$2**")
    // Replace emphasis/italic tags
    .replace(/<(em|i)>(.*?)<\/(em|i)>/g, "*$2*")
    // Replace heading tags
    .replace(/<h1>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3>(.*?)<\/h3>/g, "### $1\n\n")
    // Replace anchor tags
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")
    // Replace unordered list items
    .replace(/<li>(.*?)<\/li>/g, "- $1\n")
    // Replace ordered list items
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_match: string, content: string) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, (_m: string, item: string) => `${counter++}. ${item}\n`);
    })
    // Remove list tags (after processing list items)
    .replace(/<\/?ul>/g, "\n")
    // Replace line breaks
    .replace(/<br\s*\/?>/g, "\n")
    // Replace div tags
    .replace(/<div>(.*?)<\/div>/g, "$1\n")
    // Replace span tags
    .replace(/<span.*?>(.*?)<\/span>/g, "$1")
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, "");

  // Replace HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return markdown;
}

/**
 * Build a player headshot URL with optional size.
 */
export function playerHeadshotUrl(playerId: number, size = 200): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:83:current.png,w_${size},q_auto:best/v1/people/${playerId}/headshot/83/current`;
}

/**
 * Format an ISO date (yyyy-mm-dd) into a localized long date.
 */
export function formatISODate(dateString: string, locale = "en-US"): string {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map((num) => parseInt(num, 10));
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Check if an ISO date (yyyy-mm-dd) falls on today's month/day.
 */
export function isBirthdayISO(dateString: string, today: Date = new Date()): boolean {
  if (!dateString) return false;
  const [year, month, day] = dateString.split("-").map((num) => parseInt(num, 10));
  const d = new Date(year, month - 1, day);
  return today.getMonth() === d.getMonth() && today.getDate() === d.getDate();
}

/**
 * Find a stat block by type and group from a player's stat array.
 */
export function getStatsByType(stats: Stat[] | undefined, type: string, group = "hitting"): Stat | undefined {
  return stats?.find((s) => s.type.displayName === type && s.group.displayName === group);
}
