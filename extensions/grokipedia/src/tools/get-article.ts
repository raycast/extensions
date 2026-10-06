import { GrokipediaClient } from "../grokipedia/client";
import { formatArticleMarkdown, getArticleUrl, normalizeArticleSlug } from "../grokipedia/articles";

type Input = {
  /** Exact slug from search-articles, or a full https://grokipedia.com/page/... URL. Do not guess a slug. */
  slug: string;
};

const client = new GrokipediaClient();

/** Read an article's full Markdown and citations. Returns found: false when the article does not exist. */
export default async function getArticle(input: Input) {
  const slug = normalizeArticleSlug(input.slug);
  const response = await client.getPage(slug);
  if (!response.found) return { found: false, slug, url: getArticleUrl(slug) };
  const page = response.page;
  return {
    found: true,
    slug: page.slug,
    title: page.title,
    url: getArticleUrl(page.slug),
    description: page.description,
    content: formatArticleMarkdown(page),
    citations: page.citations.map(({ id, title, description, url }) => ({ id, title, description, url })),
  };
}
