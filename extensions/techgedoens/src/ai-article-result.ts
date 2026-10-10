import { Article } from "./articles";

export type AIArticleResult = {
  title: string;
  url: string;
  publishedAt: string;
  categories: string[];
  excerpt?: string;
  content?: string;
};

export function createAIArticleResult(article: Article, includeContent: boolean): AIArticleResult {
  return {
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt.toISOString(),
    categories: article.categories,
    excerpt: article.excerpt,
    content: includeContent ? (article.contentMarkdown ?? article.excerpt) : undefined,
  };
}
