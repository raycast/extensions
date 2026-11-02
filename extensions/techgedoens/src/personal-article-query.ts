import type { ArchivedArticle } from "./article-archive";
import { translateCategory } from "./strings";

const PERSONAL_ARTICLE_PAGE_SIZE = 5;

const STOP_WORDS = new Set([
  "aber",
  "alle",
  "als",
  "artikel",
  "auch",
  "auf",
  "aus",
  "bei",
  "das",
  "dem",
  "den",
  "der",
  "die",
  "ein",
  "eine",
  "einer",
  "eines",
  "favoriten",
  "fur",
  "gespeichert",
  "habe",
  "ich",
  "ist",
  "meine",
  "meinen",
  "mit",
  "nach",
  "oder",
  "sind",
  "thema",
  "uber",
  "und",
  "ungelesen",
  "ungelesene",
  "von",
  "was",
  "zum",
  "zur",
]);

export type PersonalArticleQuery = {
  query?: string;
  offset?: number;
};

export type PersonalArticlePage = {
  articles: ArchivedArticle[];
  matchingCount: number;
  nextOffset?: number;
  offset: number;
  query?: string;
};

export function selectPersonalArticles(articles: ArchivedArticle[], input: PersonalArticleQuery): PersonalArticlePage {
  const query = input.query?.trim() || undefined;
  const offset = normalizeOffset(input.offset);
  const matchingArticles = query ? rankMatchingArticles(articles, query) : sortNewestFirst(articles);
  const page = matchingArticles.slice(offset, offset + PERSONAL_ARTICLE_PAGE_SIZE);
  const nextOffset = offset + page.length < matchingArticles.length ? offset + page.length : undefined;

  return {
    articles: page,
    matchingCount: matchingArticles.length,
    nextOffset,
    offset,
    query,
  };
}

function rankMatchingArticles(articles: ArchivedArticle[], query: string): ArchivedArticle[] {
  const queryTerms = extractTerms(query);
  if (queryTerms.length === 0) {
    return sortNewestFirst(articles);
  }

  return articles
    .map((article) => ({ article, score: scoreArticle(article, queryTerms) }))
    .filter(({ score }) => score > 0)
    .sort(
      (first, second) =>
        second.score - first.score || second.article.publishedAt.getTime() - first.article.publishedAt.getTime(),
    )
    .map(({ article }) => article);
}

function scoreArticle(article: ArchivedArticle, queryTerms: string[]): number {
  const titleTokens = tokenize(article.title);
  const categoryTokens = tokenize(
    article.categories.flatMap((category) => [category, translateCategory(category)]).join(" "),
  );
  const excerptTokens = tokenize(article.excerpt ?? "");
  const contentTokens = tokenize(article.contentMarkdown ?? "");

  return queryTerms.reduce((score, term) => {
    const variants = createTermVariants(term);
    return (
      score +
      (containsTerm(titleTokens, variants) ? 12 : 0) +
      (containsTerm(categoryTokens, variants) ? 6 : 0) +
      (containsTerm(excerptTokens, variants) ? 3 : 0) +
      (containsTerm(contentTokens, variants) ? 1 : 0)
    );
  }, 0);
}

function extractTerms(value: string): string[] {
  return [
    ...new Set(
      normalize(value)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 2 && !STOP_WORDS.has(term)),
    ),
  ];
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
}

function createTermVariants(term: string): string[] {
  const variants = new Set([term]);
  if (term.length >= 4 && term.endsWith("s")) {
    variants.add(term.slice(0, -1));
  }
  if (term.length >= 5 && term.endsWith("e")) {
    variants.add(term.slice(0, -1));
  }
  return [...variants];
}

function containsTerm(tokens: Set<string>, variants: string[]): boolean {
  return variants.some((variant) => tokens.has(variant));
}

function sortNewestFirst(articles: ArchivedArticle[]): ArchivedArticle[] {
  return [...articles].sort((first, second) => second.publishedAt.getTime() - first.publishedAt.getTime());
}

function normalizeOffset(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : 0;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE");
}
