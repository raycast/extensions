import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";

dayjs.extend(relativeTime);

export function formatElapsedTime(date: Date | string): string {
  return dayjs(date).fromNow();
}

export function formatDate(date: Date | string): string {
  return dayjs(date).format("YYYY-MM-DD");
}

export function formatDateTime(date: Date | string): string {
  return dayjs(date).format("YYYY-MM-DD HH:mm");
}

/**
 * Convert an HTML-flavoured body (as GitHub sometimes returns) into readable
 * markdown: strips comments and tags, turns block elements into line breaks,
 * and decodes common entities. Preserves markdown autolinks like <https://…>.
 */
export function cleanHtml(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
