import { Defuddle } from "defuddle/node";
import type { ExtractedArticle } from "./types";

const EXCERPT_MAX_CHARS = 200;
const OG_IMAGE_RE = /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
const OG_IMAGE_RE_REVERSED = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i;

function extractOgImage(html: string): string {
  const match = html.match(OG_IMAGE_RE) ?? html.match(OG_IMAGE_RE_REVERSED);
  return match?.[1] ?? "";
}

function domainFor(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function buildExcerpt(content: string): string {
  // Defuddle returns HTML content — strip tags + collapse whitespace for an excerpt.
  const text = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > EXCERPT_MAX_CHARS ? `${text.slice(0, EXCERPT_MAX_CHARS).trim()}…` : text;
}

/**
 * Run defuddle over a serialized HTML document and normalise its output into
 * the shape the FlowFerry API expects. Defuddle is the parser the FlowFerry
 * app already standardises on (replaced @extractus/article-extractor in
 * v1.3.4 of the macOS/iOS app).
 */
export async function extractFromHtml(html: string, url: string): Promise<ExtractedArticle> {
  const result = await Defuddle(html, url, { separateMarkdown: true });
  const title = typeof result?.title === "string" && result.title.trim().length > 0 ? result.title.trim() : url;
  const htmlContent = typeof result?.content === "string" ? result.content : "";
  const markdownContent = typeof result?.contentMarkdown === "string" ? result.contentMarkdown : "";

  if (!markdownContent.trim()) {
    throw new Error("Couldn't extract any article content from this page.");
  }

  const ogImage = extractOgImage(html);

  return {
    title,
    content: markdownContent,
    url,
    excerpt: buildExcerpt(htmlContent),
    leadImageUrl: ogImage,
    domain: domainFor(url),
  };
}
