import { TinkererArticles } from "../api/articles";
import { getApiClient } from "../api/preferences";

type Input = {
  /** Optional search phrase for published Tinkerer Club articles. */
  query?: string;
};

export default async function getArticles(input: Input) {
  const articles = await new TinkererArticles(getApiClient()).list("published", input.query ?? "");
  return {
    articles: articles.map((article) => ({
      author: article.author,
      content: article.content,
      coverUrl: article.coverUrl,
      excerpt: article.excerpt,
      id: article.id,
      publishedAt: article.publishedAt,
      readingTimeMinutes: article.readingTimeMinutes,
      slug: article.slug,
      title: article.title,
      topics: article.topics,
      url: article.url,
    })),
  };
}
