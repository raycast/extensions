import { createAIArticleResult } from "../ai-article-result";
import { findArticle } from "../article-search";

type Input = {
  /** The exact title or Techgedöns.de URL of an article. */
  article: string;
};

export default async function getArticle(input: Input) {
  const article = await findArticle(input.article);
  if (!article) {
    return {
      found: false,
      message: "No matching Techgedöns.de article was found.",
    };
  }

  return {
    found: true,
    article: createAIArticleResult(article, true),
  };
}
