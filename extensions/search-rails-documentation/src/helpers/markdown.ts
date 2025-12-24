import { decode } from "html-entities";
import { replaceUrl } from "./url";

export function htmlToMarkdown(html: string, originalPath: string): string {
  return decode(
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (match, content) => {
        const levelMatch = match.match(/<h(\d)/);
        const level = levelMatch?.[1] || "1";
        return `${"#".repeat(Number(level))} ${content}\n\n`;
      })
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "_$1_")
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "_$1_")
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```ruby\n$1\n```")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_match, path, text) => {
        if (["&para;", "&uarr;"].includes(text)) return "";

        const url = replaceUrl(originalPath, path);
        return `[${text.replace(/^`|`$/g, "")}](${url})`;
      })
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, content) => {
        return `- ${content.trim()}`;
      })
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}
