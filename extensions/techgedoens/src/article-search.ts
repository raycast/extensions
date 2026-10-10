import { Article, ARTICLES_PER_FEED_PAGE, fetchArticleSearchPage } from "./articles";

const DEFAULT_RESULT_LIMIT = 5;
const MAX_SEARCH_QUERIES = 5;
const MAX_SEARCH_PAGES = 2;

const STOP_WORDS = new Set([
  "aber",
  "alle",
  "als",
  "artikel",
  "auch",
  "auf",
  "aus",
  "bei",
  "beitrag",
  "beitrage",
  "berichtet",
  "das",
  "dem",
  "den",
  "der",
  "die",
  "ein",
  "eine",
  "einer",
  "eines",
  "erzahlt",
  "finden",
  "fur",
  "gib",
  "gibt",
  "geschrieben",
  "habt",
  "haben",
  "hat",
  "ihr",
  "ist",
  "kann",
  "mir",
  "mit",
  "nach",
  "oder",
  "sind",
  "suche",
  "suchen",
  "techgedoens",
  "techgedons",
  "uber",
  "und",
  "veroffentlicht",
  "von",
  "was",
  "welche",
  "welcher",
  "wie",
  "wurde",
  "wurden",
  "zeigen",
  "zeigt",
  "zeig",
  "zum",
  "zur",
  "about",
  "and",
  "article",
  "articles",
  "find",
  "for",
  "from",
  "have",
  "search",
  "show",
  "techgedoens",
  "that",
  "the",
  "this",
  "what",
  "which",
  "with",
  "wrote",
  "written",
  "you",
]);

export async function searchRelevantArticles(question: string, limit = DEFAULT_RESULT_LIMIT): Promise<Article[]> {
  const searchTerms = extractSearchTerms(question);
  if (searchTerms.length === 0) {
    return [];
  }

  const searchQueries = createSearchQueries(searchTerms);
  const firstPages = await Promise.all(searchQueries.map((query) => fetchArticleSearchPage(query, 1)));
  const additionalPages = await Promise.all(
    firstPages.map((articles, index) =>
      articles.length === ARTICLES_PER_FEED_PAGE && MAX_SEARCH_PAGES > 1
        ? fetchArticleSearchPage(searchQueries[index], 2)
        : Promise.resolve([]),
    ),
  );
  const uniqueArticles = new Map<string, Article>();

  for (const article of [...firstPages, ...additionalPages].flat()) {
    if (!uniqueArticles.has(article.id)) {
      uniqueArticles.set(article.id, article);
    }
  }

  return rankArticles([...uniqueArticles.values()], searchTerms).slice(0, limit);
}

export async function findArticle(reference: string): Promise<Article | undefined> {
  const normalizedReference = reference.trim();
  if (!normalizedReference) {
    return undefined;
  }

  const referencedUrl = parseTechgedoensUrl(normalizedReference);
  const searchText = referencedUrl ? searchTextFromUrl(referencedUrl) : normalizedReference;
  const candidates = await searchRelevantArticles(searchText, ARTICLES_PER_FEED_PAGE * MAX_SEARCH_PAGES);

  if (referencedUrl) {
    const normalizedUrl = normalizeUrl(referencedUrl.toString());
    return candidates.find((article) => normalizeUrl(article.url) === normalizedUrl);
  }

  const normalizedTitle = normalizeSearchValue(normalizedReference);
  return candidates.find((article) => normalizeSearchValue(article.title) === normalizedTitle) ?? candidates[0];
}

function createSearchQueries(searchTerms: string[]): string[] {
  const combinedQuery = searchTerms.join(" ");
  if (searchTerms.length === 1) {
    return [combinedQuery];
  }

  return [combinedQuery, ...searchTerms].slice(0, MAX_SEARCH_QUERIES);
}

function extractSearchTerms(question: string): string[] {
  const uniqueTerms = new Map<string, string>();
  const terms = question
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (const term of terms) {
    const normalizedTerm = normalizeSearchValue(term);
    if (normalizedTerm.length < 2 || STOP_WORDS.has(normalizedTerm) || uniqueTerms.has(normalizedTerm)) {
      continue;
    }
    uniqueTerms.set(normalizedTerm, term);
  }

  return [...uniqueTerms.values()].slice(0, MAX_SEARCH_QUERIES - 1);
}

function rankArticles(articles: Article[], searchTerms: string[]): Article[] {
  const normalizedTerms = searchTerms.map((term) => createTermVariants(normalizeSearchValue(term)));
  const minimumStrongMatches = searchTerms.length >= 3 ? 2 : 1;

  return articles
    .map((article) => {
      const title = tokenizeSearchValue(article.title);
      const categories = tokenizeSearchValue(article.categories.join(" "));
      const excerpt = tokenizeSearchValue(article.excerpt ?? "");
      const content = tokenizeSearchValue(article.contentMarkdown ?? "");
      const strongMatches = normalizedTerms.filter(
        (termVariants) =>
          containsTerm(title, termVariants) ||
          containsTerm(categories, termVariants) ||
          containsTerm(excerpt, termVariants),
      ).length;
      const score = normalizedTerms.reduce((total, termVariants) => {
        const titleScore = containsTerm(title, termVariants) ? 12 : 0;
        const categoryScore = containsTerm(categories, termVariants) ? 6 : 0;
        const excerptScore = containsTerm(excerpt, termVariants) ? 3 : 0;
        const contentScore = containsTerm(content, termVariants) ? 1 : 0;
        return total + titleScore + categoryScore + excerptScore + contentScore;
      }, 0);
      return { article, score, strongMatches };
    })
    .filter(({ score, strongMatches }) => score > 0 && strongMatches >= minimumStrongMatches)
    .sort(
      (first, second) =>
        second.score - first.score || second.article.publishedAt.getTime() - first.article.publishedAt.getTime(),
    )
    .map(({ article }) => article);
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

function tokenizeSearchValue(value: string): Set<string> {
  return new Set(
    normalizeSearchValue(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
}

function containsTerm(tokens: Set<string>, termVariants: string[]): boolean {
  return termVariants.some((term) => tokens.has(term));
}

function parseTechgedoensUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.hostname === "tchgdns.de" || url.hostname === "www.tchgdns.de" ? url : undefined;
  } catch {
    return undefined;
  }
}

function searchTextFromUrl(url: URL): string {
  const slug = decodeURIComponent(url.pathname).split("/").filter(Boolean).at(-1) ?? "";
  return slug.replace(/[-_]+/g, " ");
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value;
  }
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE");
}
