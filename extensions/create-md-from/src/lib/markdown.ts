import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export interface Article {
  title: string;
  markdown: string;
}

/** Convert an HTML fragment (e.g. clipboard `html`) to Markdown, preserving images. */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}

/** Whether `text` is a single http(s) URL. */
export function isUrl(text: string): boolean {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fetch a URL, extract the readable article (readability) and convert it to
 * Markdown (turndown). Throws if the page can't be fetched or no article is found
 * — callers surface a toast telling the user to select the page manually (⌘A).
 */
export async function urlToMarkdown(rawUrl: string): Promise<Article> {
  const url = rawUrl.trim();
  const res = await fetch(url, {
    headers: {
      // Some sites 403 a bare client; present as a normal browser.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  const html = await res.text();

  const { document } = parseHTML(html);
  // Readability needs a base URI to resolve relative links/images.
  const article = new Readability(document as unknown as Document).parse();
  if (!article || !article.content) {
    throw new Error("Could not extract article content");
  }

  const markdown = turndown.turndown(article.content).trim();
  if (markdown.length === 0) {
    throw new Error("Extracted content was empty");
  }

  return {
    title: (article.title ?? "").trim(),
    markdown,
  };
}
