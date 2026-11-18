import { useState, useEffect, useRef } from "react";

// Shared helpers for fetching a GitLab page and rendering its content in a
// Raycast detail view. Raycast's detail view renders Markdown (not HTML), so
// the page HTML is converted into the closest Markdown equivalent.

export function usePageContent(url: string | null) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Cache fetched content per URL so revisiting an item is instant.
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!url) {
      setContent("");
      setIsLoading(false);
      return;
    }

    const cached = cacheRef.current.get(url);
    if (cached !== undefined) {
      setContent(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setContent("");
    setIsLoading(true);

    (async () => {
      try {
        const markdown = await fetchPageContent(url);
        cacheRef.current.set(url, markdown);
        if (!cancelled) {
          setContent(markdown);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("page content error", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { content, isLoading };
}

async function fetchPageContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return htmlToMarkdown(extractMain(html), url);
  } finally {
    clearTimeout(timeout);
  }
}

// Extract the server-rendered <main> region, which contains the page content.
function extractMain(html: string): string {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return match ? match[1] : html;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function htmlToMarkdown(html: string, baseUrl: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<(nav|aside|footer)\b[\s\S]*?<\/\1>/gi, "");

  // Drop the page's own <h1>; the detail markdown already adds a title.
  text = text.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "");

  // Code blocks and inline code first, so their contents aren't mangled.
  text = text
    .replace(
      /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi,
      (_, code) => `\n\n\`\`\`\n${decodeEntities(stripTags(code)).trim()}\n\`\`\`\n\n`,
    )
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${decodeEntities(stripTags(code))}\``);

  // Images -> Markdown images (resolve relative URLs against the page).
  text = text.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (tag.match(/\bsrc="([^"]+)"/i) || [])[1];
    const alt = (tag.match(/\balt="([^"]*)"/i) || [])[1] || "";
    if (!src) return "";
    return `\n\n![${alt}](${resolveUrl(src, baseUrl)})\n\n`;
  });

  // Embeds (e.g. Storybook iframes) can't render in Markdown, so expose them
  // as links to open the live demo in a browser.
  text = text.replace(/<iframe\b[^>]*>(?:[\s\S]*?<\/iframe>)?/gi, (tag) => {
    const src = (tag.match(/\bsrc="([^"]+)"/i) || [])[1];
    const title = (tag.match(/\btitle="([^"]*)"/i) || [])[1] || "Open embed";
    if (!src) return "";
    return `\n\n▶ [${title}](${resolveUrl(src, baseUrl)})\n\n`;
  });

  // Links -> Markdown links.
  text = text.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
    const linkText = stripTags(label).trim();
    if (!linkText) return "";
    return `[${linkText}](${resolveUrl(href, baseUrl)})`;
  });

  // Emphasis.
  text = text
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_");

  // Headings, lists, and block separators.
  text = text
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<\/(p|div|section|tr|ul|ol|table)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // Strip any remaining tags and decode entities.
  text = decodeEntities(text.replace(/<[^>]+>/g, ""));

  // Collapse excess whitespace/newlines and trim leading space per line.
  return text
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

export function buildDetailMarkdown(name: string, category: string | undefined, body: string): string {
  return [`# ${name}`, category ? `_${category}_` : "", "", body].join("\n");
}
