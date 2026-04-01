import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  baseUrl: string;
}

function getBaseUrl(): string {
  const { baseUrl } = getPreferenceValues<Preferences>();
  return baseUrl.replace(/\/$/, "") || "https://smry.ai";
}

export interface Article {
  title: string;
  content: string;
  textContent: string;
  byline?: string;
  siteName?: string;
  publishedDate?: string;
  image?: string;
  url: string;
}

interface ArticleResponse {
  source?: string;
  article?: Article;
  error?: string;
  status?: string;
}

export async function fetchArticle(url: string): Promise<Article> {
  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/article/auto?url=${encodeURIComponent(url)}`;

  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "SMRY-Raycast/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ArticleResponse;
    throw new Error(errorData.error || `Failed to fetch article: ${response.status}`);
  }

  const data = (await response.json()) as ArticleResponse;

  if (!data.article) {
    throw new Error(data.error || "Failed to extract article");
  }

  return { ...data.article, url };
}


export function getSmryUrl(articleUrl: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${articleUrl}`;
}

export function normalizeUrl(text: string): string {
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(normalizeUrl(text));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function htmlToMarkdown(html: string): string {
  let md = html;
  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  // Bold and italic
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  // List items
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content.trim().split("\n").map((line: string) => `> ${line}`).join("\n") + "\n\n";
  });
  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, "```\n$1\n```\n\n");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  // Paragraphs and line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n");
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gis, "$1\n\n");
  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, "\n---\n\n");
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");
  // Clean up excessive newlines
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}
