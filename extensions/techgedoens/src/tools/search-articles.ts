import { createAIArticleResult } from "../ai-article-result";
import { searchRelevantArticles } from "../article-search";

type Input = {
  /** A concise German topic or a few keywords to search for in the Techgedöns.de article archive. */
  query: string;
};

export default async function searchArticles(input: Input) {
  const articles = await searchRelevantArticles(input.query, 5);

  return {
    query: input.query,
    resultCount: articles.length,
    articles: articles.map((article) => createAIArticleResult(article, true)),
  };
}
