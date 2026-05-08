import { load } from "cheerio";

const DOMAINS: string[] = ["https://annas-archive.gl", "https://annas-archive.pk", "https://annas-archive.gd"];
const REQUEST_TIMEOUT_MS = 15000;

export type SearchResult = {
  md5: string;
  title: string;
  author?: string;
  format?: string;
  size?: string;
  language?: string;
  year?: string;
  contentType?: string;
  coverUrl?: string;
  url: string;
  sourceDomain: string;
};

export type SearchPage = {
  results: SearchResult[];
  page: number;
  hasMore: boolean;
  searchUrl: string;
};

export type FastDownloadInfo = {
  downloadUrl: string;
};

type FetchTextResult = {
  body: string;
  domain: string;
};

type FastDownloadResponse = {
  download_url?: string | null;
  error?: string | null;
};

export function buildSearchPath(query: string, page: number): string {
  const params = new URLSearchParams({
    q: query,
    ext: "epub",
    lang: "en",
    page: String(page),
  });

  return `/search?${params.toString()}`;
}

export function buildAbsoluteUrl(path: string, domain = DOMAINS[0]): string {
  return new URL(path, domain).toString();
}

export function buildSlowDownloadUrl(md5: string, domain = DOMAINS[0], pathIndex = 0, domainIndex = 0): string {
  return `${domain}/slow_download/${md5}/${pathIndex}/${domainIndex}`;
}

export async function searchEpubs(query: string, page = 1): Promise<SearchPage> {
  const path = buildSearchPath(query, page);
  const { body, domain } = await fetchTextWithFailover(path);
  const parsed = parseSearchResults(body, domain, page, query);

  return {
    ...parsed,
    searchUrl: buildAbsoluteUrl(path, domain),
  };
}

export async function getFastDownloadUrl(
  md5: string,
  secretKey: string,
  pathIndex = 0,
  domainIndex = 0,
): Promise<FastDownloadInfo> {
  const cleanKey = secretKey.trim();
  if (!cleanKey) {
    throw new Error("Anna's Archive secret key is missing.");
  }

  let lastError: Error | undefined;

  for (const domain of DOMAINS) {
    const params = new URLSearchParams({
      md5,
      key: cleanKey,
      path_index: String(pathIndex),
      domain_index: String(domainIndex),
    });

    try {
      const response = await fetchWithTimeout(`${domain}/dyn/api/fast_download.json?${params.toString()}`);
      const bodyText = await response.text();

      if (!response.ok) {
        throw new Error(extractApiError(bodyText) ?? `Fast download API returned HTTP ${response.status}.`);
      }

      const body = parseJson<FastDownloadResponse>(bodyText);
      if (body.error) {
        throw new Error(body.error);
      }

      if (!body.download_url) {
        throw new Error("Fast download API did not return a download URL.");
      }

      return { downloadUrl: body.download_url };
    } catch (error) {
      lastError = normalizeError(error);
    }
  }

  throw lastError ?? new Error("Failed to get a fast download URL from Anna's Archive.");
}

function parseSearchResults(html: string, domain: string, page: number, query: string): Omit<SearchPage, "searchUrl"> {
  const $ = load(html);
  const resultsByMd5 = new Map<string, SearchResult>();

  $("a.js-vim-focus[href^='/md5/']").each((_, element) => {
    const titleLink = $(element);
    const href = titleLink.attr("href") ?? "";
    const md5 = href.replace(/^\/md5\//, "").trim();
    const title = decodeText(titleLink.text());

    if (!/^[a-f0-9]{32}$/i.test(md5) || !title) {
      return;
    }

    const container = titleLink.closest("div.flex.pt-3.pb-3.border-b");
    const scope = container.length > 0 ? container : titleLink.parent();
    const metadataText = decodeText(scope.find("div.text-gray-800").first().text());
    const filePathText = decodeText(scope.find("div.font-mono").first().text());
    const coverUrl = extractCoverUrl($, scope, domain);
    const metadataParts = splitMetadata(metadataText);

    const format = metadataParts.find((part) => /^epub$/i.test(part));
    const size = metadataParts.find((part) => /^\d+(?:\.\d+)?\s*(?:kb|mb|gb|b)$/i.test(part));
    const year = metadataParts.find((part) => /^(?:1[5-9]|20)\d{2}$/.test(part));
    const language = metadataParts.find((part) => /\[[a-z]{2,3}\]/i.test(part));
    const contentType = metadataParts.find((part) => /book \(/i.test(part));

    if (!format && !/\bepub\b/i.test(metadataText) && !/\.epub(?:\b|$)/i.test(filePathText)) {
      return;
    }

    if (!isEnglishLanguage(language)) {
      return;
    }

    const author = extractAuthor($, scope, title, filePathText);

    resultsByMd5.set(md5.toLowerCase(), {
      md5: md5.toLowerCase(),
      title,
      author,
      format: format?.toUpperCase() ?? "EPUB",
      size,
      language,
      year,
      contentType,
      coverUrl,
      url: buildAbsoluteUrl(`/md5/${md5.toLowerCase()}`, domain),
      sourceDomain: domain,
    });
  });

  const repairedResults = repairAuthorsFromResultConsensus([...resultsByMd5.values()]);

  return {
    results: rankAndDedupeResults(repairedResults, query),
    page,
    hasMore: $("a.js-pagination-next-page[href]").length > 0,
  };
}

function extractCoverUrl(
  $: ReturnType<typeof load>,
  scope: ReturnType<ReturnType<typeof load>>,
  domain: string,
): string | undefined {
  const source = scope.find("img[src]").first().attr("src")?.trim();
  if (!source) {
    return undefined;
  }

  try {
    return buildAbsoluteUrl(source, domain);
  } catch {
    return undefined;
  }
}

function extractAuthor(
  $: ReturnType<typeof load>,
  scope: ReturnType<ReturnType<typeof load>>,
  title: string,
  filePathText: string,
): string | undefined {
  const authorFromMetadata = scope
    .find("a[href^='/search?q=']")
    .toArray()
    .filter((link) => $(link).find("span.icon-\\[mdi--user-edit\\]").length > 0)
    .map((link) => cleanAuthorName(decodeText($(link).text())))
    .find((text) => text && !isSuspiciousAuthor(text, title));

  if (authorFromMetadata) {
    return authorFromMetadata;
  }

  return inferAuthorFromFilePath(filePathText, title);
}

function inferAuthorFromFilePath(filePathText: string, title: string): string | undefined {
  const fileName =
    filePathText
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.epub$/i, "") ?? "";
  const baseTitle = normalizeTitleForGrouping(title);
  const parts = fileName
    .split(/\s+-\s+/)
    .map((part) => cleanPathPart(part))
    .filter(Boolean);

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (normalizeTitleForGrouping(part).includes(baseTitle)) {
      const nextPart = parts[index + 1] ? cleanAuthorName(parts[index + 1]) : undefined;
      if (nextPart && !isSuspiciousAuthor(nextPart, title)) {
        return nextPart;
      }

      const previousPart = parts[index - 1] ? cleanAuthorName(parts[index - 1]) : undefined;
      if (previousPart && !isSuspiciousAuthor(previousPart, title)) {
        return previousPart;
      }
    }
  }

  if (parts.length >= 2 && normalizeTitleForGrouping(parts[0]).includes(baseTitle)) {
    const candidate = cleanAuthorName(parts[1]);
    return candidate && !isSuspiciousAuthor(candidate, title) ? candidate : undefined;
  }

  return undefined;
}

function repairAuthorsFromResultConsensus(results: SearchResult[]): SearchResult[] {
  const authorCountsByTitle = new Map<string, Map<string, { display: string; count: number }>>();

  for (const result of results) {
    if (!result.author || isSuspiciousAuthor(result.author, result.title)) {
      continue;
    }

    const titleKey = normalizeTitleForGrouping(result.title);
    const authorKey = normalizeAuthorForGrouping(result.author);
    const authors = authorCountsByTitle.get(titleKey) ?? new Map<string, { display: string; count: number }>();
    const current = authors.get(authorKey);

    authors.set(authorKey, {
      display: current?.display ?? result.author,
      count: (current?.count ?? 0) + 1,
    });
    authorCountsByTitle.set(titleKey, authors);
  }

  return results.map((result) => {
    if (result.author && !isSuspiciousAuthor(result.author, result.title)) {
      return result;
    }

    const titleKey = normalizeTitleForGrouping(result.title);
    const dominantAuthor = [...(authorCountsByTitle.get(titleKey)?.values() ?? [])].sort(
      (left, right) => right.count - left.count,
    )[0];

    return dominantAuthor ? { ...result, author: dominantAuthor.display } : result;
  });
}

function rankAndDedupeResults(results: SearchResult[], query: string): SearchResult[] {
  const ranked = results
    .map((result, index) => ({ result, index, score: scoreResult(result, query) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const deduped = new Map<string, SearchResult>();

  for (const { result } of ranked) {
    const key = [
      normalizeTitleForGrouping(result.title),
      normalizeAuthorForGrouping(result.author),
      result.size ?? "",
      result.year ?? "",
      normalizeLanguage(result.language),
    ].join("|");

    if (!deduped.has(key)) {
      deduped.set(key, result);
    }
  }

  return [...deduped.values()];
}

function scoreResult(result: SearchResult, query: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(result.title);
  const groupedTitle = normalizeTitleForGrouping(result.title);
  let score = 0;

  if (groupedTitle === normalizedQuery) {
    score += 60;
  }

  if (normalizedTitle === normalizedQuery) {
    score += 50;
  } else if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 30;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 10;
  }

  if (result.author && !isSuspiciousAuthor(result.author, result.title)) {
    score += 8;
  }

  if (/book \(fiction\)/i.test(result.contentType ?? "")) {
    score += 8;
  }

  if (/book \(non-fiction\)/i.test(result.contentType ?? "")) {
    score -= 6;
  }

  if (/\b(?:collection|boxed set|bundle)\b/i.test(result.title)) {
    score -= 20;
  }

  return score;
}

function cleanAuthorName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const withoutBracketAlias = value.replace(/\s+\[[^\]]+\]\s*$/, "").trim();
  const commaMatch = withoutBracketAlias.match(/^([^,]+),\s*(.+)$/);
  const cleaned = commaMatch ? `${commaMatch[2]} ${commaMatch[1]}` : withoutBracketAlias;

  return cleanPathPart(cleaned);
}

function cleanPathPart(value: string): string {
  return value
    .replace(/\([^)]*\)\s*$/g, "")
    .replace(/\s+#?\(?v\d+(?:\.\d+)?\)?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSuspiciousAuthor(author: string, title: string): boolean {
  const normalizedAuthor = normalizeText(author);
  const normalizedTitle = normalizeTitleForGrouping(title);

  if (!normalizedAuthor || normalizedAuthor.length > 80) {
    return true;
  }

  if (normalizedAuthor === normalizedTitle || normalizedTitle.includes(normalizedAuthor)) {
    return true;
  }

  const commaMatch = author.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch && normalizeText(`${commaMatch[2]} ${commaMatch[1]}`) === normalizedTitle) {
    return true;
  }

  return false;
}

function normalizeTitleForGrouping(title: string): string {
  return normalizeText(title)
    .replace(/\b(?:a\s+)?culture\s+novel(?:\s+book)?\s*\d*\b/g, "")
    .replace(/\bculture\s*#?\s*\d*\b/g, "")
    .replace(/\bbook\s*\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAuthorForGrouping(author: string | undefined): string {
  return normalizeText(cleanAuthorName(author) ?? "");
}

function normalizeLanguage(language: string | undefined): string {
  return normalizeText(language ?? "");
}

function isEnglishLanguage(language: string | undefined): boolean {
  return /\[en\]/i.test(language ?? "");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTextWithFailover(path: string): Promise<FetchTextResult> {
  let lastError: Error | undefined;

  for (const domain of DOMAINS) {
    try {
      const response = await fetchWithTimeout(buildAbsoluteUrl(path, domain));
      if (!response.ok) {
        throw new Error(`Anna's Archive returned HTTP ${response.status}.`);
      }

      return {
        body: await response.text(),
        domain,
      };
    } catch (error) {
      lastError = normalizeError(error);
    }
  }

  throw lastError ?? new Error("Failed to fetch Anna's Archive search results.");
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "raycast-melange/0.1.0",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function splitMetadata(metadataText: string): string[] {
  return metadataText
    .split("·")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function decodeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Anna's Archive returned invalid JSON.");
  }
}

function extractApiError(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const body = JSON.parse(value) as FastDownloadResponse;
    return body.error ?? undefined;
  } catch {
    return value.includes("no_membership") ? "No active membership for this secret key." : undefined;
  }
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
