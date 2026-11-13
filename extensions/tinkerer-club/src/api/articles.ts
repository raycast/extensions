import { TinkererApiClient } from "./client";
import { ClubArticle, parseArticle, parseArticles } from "../lib/article";

export type ArticleView = "published" | "drafts";

export class TinkererArticles {
  constructor(readonly client: TinkererApiClient) {}

  async list(view: ArticleView, query = "", signal?: AbortSignal): Promise<ClubArticle[]> {
    if (view === "drafts") {
      const result = await this.client.call({ path: "post.myDrafts", type: "query" }, {}, signal);
      const articles = parseArticles(result, this.client.baseUrl, true);
      const normalizedQuery = query.trim().toLocaleLowerCase();
      if (!normalizedQuery) return articles;
      return articles.filter((article) =>
        [
          article.title,
          article.excerpt,
          article.content,
          article.author.name,
          article.author.username,
          ...article.topics,
        ]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
      );
    }

    const result = await this.client.call(
      { path: "post.articleDirectoryPage", type: "query" },
      { limit: 30, query: query.trim().slice(0, 200) },
      signal,
    );
    return parseArticles(result, this.client.baseUrl);
  }

  async get(id: string, isDraft = false, signal?: AbortSignal): Promise<ClubArticle | undefined> {
    const result = await this.client.call({ path: "post.byId", type: "query" }, { id }, signal);
    return parseArticle(result, this.client.baseUrl, isDraft);
  }
}
