// What the AI tools return: compact JSON like the MCP server's
// (docs/mcp.md), without HTML, image URLs or sync revisions.

import { articleUrl, getSession } from "./api";
import { displayTitle, fraction, quoteText, snippetText } from "./logic";
import type { Article, Highlight } from "./types";

export async function requireSession() {
  if (!(await getSession())) {
    throw new Error("Not signed in to Texthyper. Ask the user to run the Texthyper Account command in Raycast first.");
  }
}

export function clamp(value: number | undefined, fallback: number, max: number): number {
  return Math.min(Math.max(Math.floor(value || fallback), 1), max);
}

export function compactArticle(article: Article) {
  return {
    id: article.id,
    title: displayTitle(article),
    url: article.url,
    app_url: articleUrl(article),
    author: article.author || undefined,
    site: article.site_name || article.domain || undefined,
    reading_time_minutes: article.reading_time ?? undefined,
    saved_at: article.saved_at,
    status: article.status,
    archived: article.archived,
    liked: article.liked,
    read_fraction: Math.round(fraction(article) * 100) / 100,
    tags: article.tags,
    highlights_count: article.highlights_count,
    excerpt: article.snippet ? snippetText(article.snippet) : article.excerpt || undefined,
  };
}

export function compactHighlight(highlight: Highlight, article?: Article) {
  return {
    id: highlight.id,
    quote: quoteText(highlight),
    note: highlight.comment?.trim() || undefined,
    color: highlight.color,
    created_at: highlight.created_at,
    article: article
      ? {
          id: article.id,
          title: displayTitle(article),
          author: article.author || undefined,
          app_url: articleUrl(article),
        }
      : { id: highlight.article_id },
  };
}
