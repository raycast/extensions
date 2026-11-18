import { createAIArticleResult } from "../ai-article-result";
import { fetchArticles } from "../articles";

export default async function getLatestArticles() {
  const articles = await fetchArticles(5);

  return {
    resultCount: articles.length,
    articles: articles.map((article) => createAIArticleResult(article, false)),
  };
}
