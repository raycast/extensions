import fetch from "node-fetch";

import { Article } from "./type";

// Base Publico API URLs
const BASE_URL = "https://www.publico.pt/api";

function ensureArticleArray(data: unknown): Article[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data as Article[];
}

function ensureArticle(data: unknown): Article | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as Article;
}

// Fetch latest headlines
export async function fetchLatestHeadlines(): Promise<Article[]> {
  try {
    const response = await fetch(`${BASE_URL}/list/ultimas`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch latest headlines: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return ensureArticleArray(data);
  } catch (error) {
    console.error("Error fetching latest headlines:", error);
    throw error;
  }
}

// Fetch top news
export async function fetchTopNews(): Promise<Article[]> {
  try {
    const response = await fetch(`${BASE_URL}/list/destaque`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch top news: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return ensureArticleArray(data);
  } catch (error) {
    console.error("Error fetching top news:", error);
    throw error;
  }
}

// Search articles
export async function searchArticles(query: string): Promise<Article[]> {
  try {
    // Encode the query parameter
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/list/search?query=${encodedQuery}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to search articles: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return ensureArticleArray(data);
  } catch (error) {
    console.error("Error searching articles:", error);
    throw error;
  }
}

// Extract article ID from URL
export function extractArticleId(url: string): string | null {
  try {
    if (!url) {
      return null;
    }

    // Check if it's directly a numeric ID
    if (/^\d+$/.test(url)) {
      return url;
    }

    // Pattern for /editorial/ URLs: extract the number after the last dash
    const patternEditorial = /editorial\/[^-]+-(\d+)(?:\?|$|#)/;
    const matchEditorial = url.match(patternEditorial);
    if (matchEditorial && matchEditorial[1]) {
      return matchEditorial[1];
    }

    // Pattern for /noticia/ URLs: extract the number after the last dash
    const patternNoticia = /noticia\/[^-]+-(\d+)(?:\?|$|#)/;
    const matchNoticia = url.match(patternNoticia);
    if (matchNoticia && matchNoticia[1]) {
      return matchNoticia[1];
    }

    // General pattern: find any number at the end of the URL path (before query params)
    const patternGeneral = /\/([0-9]+)(?:\?|$|#)/;
    const matchGeneral = url.match(patternGeneral);
    if (matchGeneral && matchGeneral[1]) {
      return matchGeneral[1];
    }

    // Last fallback: extract any number with 6+ digits from the URL
    const patternFallback = /-(\d{6,})(?:\?|$|#)/;
    const matchFallback = url.match(patternFallback);
    if (matchFallback && matchFallback[1]) {
      return matchFallback[1];
    }

    return null;
  } catch (error) {
    console.error("Error extracting article ID:", error);
    return null;
  }
}

// Fetch article detail by ID
export async function fetchArticleDetail(
  articleId: string,
): Promise<Article | null> {
  try {
    if (!articleId) {
      throw new Error("Article ID is required");
    }

    const url = `${BASE_URL}/content/news/${articleId}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch article detail: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return ensureArticle(data);
  } catch (error) {
    console.error("Error fetching article detail:", error);
    throw error;
  }
}
