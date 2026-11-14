import type { Article } from "./articles";
import { translateCategory } from "./strings";

const RELATED_ARTICLE_LIMIT = 10;
const MINIMUM_RELATED_SCORE = 12;

const STOP_WORDS = new Set([
  "aber",
  "alle",
  "als",
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
  "fur",
  "hat",
  "ist",
  "mit",
  "nach",
  "oder",
  "sich",
  "sind",
  "und",
  "von",
  "wie",
  "wird",
  "zum",
  "zur",
  "the",
  "with",
]);

export function createRelatedArticleSearchText(sourceArticle: Article): string {
  return [sourceArticle.title, sourceArticle.categories.map(translateCategory).join(" "), sourceArticle.excerpt]
    .filter(Boolean)
    .join(" ");
}

export function findRelatedArticles<T extends Article>(
  sourceArticle: Article,
  candidates: T[],
  limit = RELATED_ARTICLE_LIMIT,
): T[] {
  const sourceTitleTokens = tokenize(sourceArticle.title);
  const sourceExcerptTokens = tokenize(sourceArticle.excerpt ?? "");
  const sourceCategories = new Set(sourceArticle.categories.map((category) => normalize(translateCategory(category))));
  const sourcePublishedAt = sourceArticle.publishedAt.getTime();
  const sourceUrl = normalizeUrl(sourceArticle.url);

  return candidates
    .filter(
      (candidate) =>
        candidate.id !== sourceArticle.id &&
        normalizeUrl(candidate.url) !== sourceUrl &&
        candidate.publishedAt.getTime() < sourcePublishedAt,
    )
    .map((candidate) => ({ candidate, score: scoreRelatedArticle(candidate) }))
    .filter(({ score }) => score >= MINIMUM_RELATED_SCORE)
    .sort(
      (first, second) =>
        second.score - first.score || second.candidate.publishedAt.getTime() - first.candidate.publishedAt.getTime(),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);

  function scoreRelatedArticle(candidate: Article): number {
    const candidateTitleTokens = tokenize(candidate.title);
    const candidateExcerptTokens = tokenize(candidate.excerpt ?? "");
    const candidateCategories = new Set(candidate.categories.map((category) => normalize(translateCategory(category))));
    const sharedTitleTokens = intersectionSize(sourceTitleTokens, candidateTitleTokens);
    const titleTermsInExcerpt = intersectionSize(sourceTitleTokens, candidateExcerptTokens);
    const excerptTermsInTitle = intersectionSize(sourceExcerptTokens, candidateTitleTokens);
    const sharedCategories = intersectionSize(sourceCategories, candidateCategories);

    return sharedTitleTokens * 12 + titleTermsInExcerpt * 4 + excerptTermsInTitle * 3 + sharedCategories * 8;
  }
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE");
}

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, "").toLocaleLowerCase("en-US");
}

function intersectionSize(first: Set<string>, second: Set<string>): number {
  let matches = 0;
  for (const value of first) {
    if (second.has(value)) {
      matches += 1;
    }
  }
  return matches;
}
