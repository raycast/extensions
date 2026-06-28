import * as cheerio from "cheerio";
import { Article } from "../types";

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
