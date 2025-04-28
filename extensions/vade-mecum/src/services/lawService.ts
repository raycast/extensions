import { Buffer } from "buffer";
import * as cheerio from "cheerio";
import { decode } from "iconv-lite";
import { Article } from "../types";

export async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 200) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries`);
}

export async function fetchLawContent(url: string): Promise<string> {
  const options: RequestInit = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  };

  const response = await fetchWithRetry(url, options);
  const arrayBuffer = await response.arrayBuffer();
  return decode(Buffer.from(arrayBuffer), "iso-8859-1");
}

export function parseArticles(lawData: string): Article[] {
  const articles: Article[] = [];

  const $ = cheerio.load(lawData);
  let currentArticle: Article | null = null;

  // First try to find articles in <p> tags
  $("p").each((_, element) => {
    let content = $(element).text();
    content = content.replace(/\s+/g, " ").trim();
    content = content.replace(/(?<=(Art\.|§)\s\d+)\s?o /g, "º ");

    if (content.startsWith("Art.")) {
      const titleMatch = content.match(/(Art\.\s\d+(\.\d+)*(º|°)?(-[A-Z])?)/);
      let title = "";
      if (titleMatch) {
        title = titleMatch[0];
      }

      if (title && content) {
        currentArticle = { title: title.trim(), content: content.trim() };
        articles.push(currentArticle);
      }
    } else if (
      currentArticle &&
      (content.startsWith("§") ||
        /^[IVXLCDM]+\s-\s/.test(content) ||
        content.startsWith("Parágrafo único") ||
        /^[a-z]\)/.test(content))
    ) {
      currentArticle.content += `\n\n${content.trim()}`;
    }
  });

  // If no articles found in <p> tags, try other common HTML structures
  if (articles.length === 0) {
    // Try to find articles in any element containing text that starts with "Art."
    $("*")
      .contents()
      .each((_, node) => {
        if (node.type === "text") {
          const content = $(node).text().trim();
          if (content.startsWith("Art.")) {
            const titleMatch = content.match(/(Art\.\s\d+(\.\d+)*(º|°)?(-[A-Z])?)/);
            if (titleMatch) {
              const title = titleMatch[0];
              articles.push({ title: title.trim(), content: content.trim() });
            }
          }
        }
      });
  }

  return articles;
}
