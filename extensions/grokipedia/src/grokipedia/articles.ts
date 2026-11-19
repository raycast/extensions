import { GrokipediaValidationError } from "./errors";
import { Page } from "./types";

export function normalizeArticleSlug(value: string): string {
  const input = value.trim();
  if (!input) throw new GrokipediaValidationError("Provide a Grokipedia article slug or URL.");
  if (!/^https?:\/\//i.test(input)) return input;

  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/page\/([^/]+)\/?$/);
    if ((url.hostname === "grokipedia.com" || url.hostname === "www.grokipedia.com") && match) {
      const slug = decodeURIComponent(match[1]);
      if (slug.trim()) return slug;
    }
  } catch {
    // Report a useful input error for malformed URLs and escaped slugs.
  }
  throw new GrokipediaValidationError(
    "Use an article slug or a URL such as https://grokipedia.com/page/Raycast_software.",
  );
}

export function getArticleUrl(slug: string): string {
  return `https://grokipedia.com/page/${encodeURIComponent(slug)}`;
}

export function formatArticleMarkdown(page: Page): string {
  let content = page.content.replace(/(!?\[[^\]]*\]\()((?:\/|#)[^)]*)(\))/g, (_match, start, path, end) => {
    return `${start}${new URL(path, getArticleUrl(page.slug)).toString()}${end}`;
  });
  page.citations.forEach((citation, index) => {
    const escapedUrl = citation.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(new RegExp(`\\[\\]\\(${escapedUrl}\\)`, "g"), () => {
      return `[[${index + 1}]](${citation.url})`;
    });
  });
  return content;
}
