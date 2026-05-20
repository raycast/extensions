import { Cache } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "../config";
import { getSearchTerms, includesAllSearchTerms, scoreSearchResult } from "../scoring";

const ARCHIVE_DOCUMENTS_CACHE_KEY = "archive-document-results-v1";
const ARCHIVE_TOC_CACHE_KEY = "archive-toc-results-v1";
const ARCHIVE_REQUEST_TIMEOUT_MS = 8000;
const ARCHIVE_TOC_REQUEST_TIMEOUT_MS = 5000;
const ARCHIVE_TOC_CONCURRENCY = 4;
const cache = new Cache({ namespace: "apple-developer-docs-archive", capacity: 25 * 1024 * 1024 });

export type ArchiveIndexStatus = {
  isEnabled: boolean;
  phase: "disabled" | "idle" | "loading-documents" | "building-toc" | "ready" | "error";
  documentCount: number;
  tocCount: number;
  processedBooks: number;
  totalBooks: number;
};

type ArchiveLibrary = {
  columns: {
    name: number;
    id: number;
    type: number;
    date: number;
    topic: number;
    framework: number;
    url: number;
    displayDate: number;
    platform: number;
  };
  topics: ArchiveTopic[];
  documents: ArchiveDocument[];
};

type ArchiveTopic = {
  name: string;
  contents: ArchiveTopicContent[];
};

type ArchiveTopicContent = {
  key: string;
  name: string;
};

type ArchiveDocument = (string | number)[];

type ArchiveBook = {
  title?: string;
  sections?: ArchiveBookSection[];
};

type ArchiveBookSection = {
  title?: string;
  href?: string;
  sections?: ArchiveBookSection[];
};

export default function useArchiveResults(
  query: string,
  typeFilter: AllResultType | ResultType,
  includeArchiveResults: boolean
) {
  const [documentResults, setDocumentResults] = useState<SearchResult[]>(() =>
    readCachedResults(ARCHIVE_DOCUMENTS_CACHE_KEY)
  );
  const [tocResults, setTocResults] = useState<SearchResult[]>(() => readCachedResults(ARCHIVE_TOC_CACHE_KEY));
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(documentResults.length === 0);
  const [isBuildingToc, setIsBuildingToc] = useState(false);
  const [hasArchiveError, setHasArchiveError] = useState(false);
  const [tocProgress, setTocProgress] = useState({ processedBooks: 0, totalBooks: 0 });
  const isTocBuildRunningRef = useRef(false);
  const hasCompleteTocIndexRef = useRef(tocResults.length > 0);
  const shouldSearchArchive = includeArchiveResults && (typeFilter === "all" || typeFilter === "archive");
  const shouldLoadArchive = shouldSearchArchive && query.trim().length > 1;

  useEffect(() => {
    if (!includeArchiveResults || !shouldLoadArchive || documentResults.length > 0) {
      setIsLoadingDocuments(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDocuments(true);
    setHasArchiveError(false);

    fetchArchiveDocumentResults()
      .then((results) => {
        if (!isMounted) {
          return;
        }

        setDocumentResults(results);
        setIsLoadingDocuments(false);
      })
      .catch(() => {
        if (isMounted) {
          setHasArchiveError(true);
          setIsLoadingDocuments(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentResults.length, includeArchiveResults, shouldLoadArchive]);

  useEffect(() => {
    if (!shouldLoadArchive) {
      isTocBuildRunningRef.current = false;
      setIsBuildingToc(false);
    }
  }, [shouldLoadArchive]);

  useEffect(() => {
    if (
      !includeArchiveResults ||
      !shouldLoadArchive ||
      documentResults.length === 0 ||
      hasCompleteTocIndexRef.current ||
      isTocBuildRunningRef.current
    ) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    isTocBuildRunningRef.current = true;
    setIsBuildingToc(true);

    buildArchiveTocResults(
      documentResults,
      controller.signal,
      (results) => {
        if (isMounted) {
          setTocResults(results);
        }
      },
      (progress) => {
        if (isMounted) {
          setTocProgress(progress);
        }
      }
    )
      .then((results) => {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        isTocBuildRunningRef.current = false;
        hasCompleteTocIndexRef.current = true;
        setTocResults(results);
        setIsBuildingToc(false);
      })
      .catch(() => {
        if (isMounted) {
          isTocBuildRunningRef.current = false;
          setHasArchiveError(true);
          setIsBuildingToc(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
      isTocBuildRunningRef.current = false;
      setIsBuildingToc(false);
    };
    // Keep the archive TOC build running through progress updates instead of restarting on every tocResults change.
  }, [documentResults, includeArchiveResults, shouldLoadArchive]);

  const archiveResults = useMemo(() => [...tocResults, ...documentResults], [documentResults, tocResults]);

  const results = useMemo(() => {
    if (!shouldSearchArchive) {
      return [];
    }

    const terms = getSearchTerms(query);
    if (terms.length === 0) {
      return [];
    }

    return archiveResults
      .filter((result) => includesAllSearchTerms(result, terms))
      .map((result) => ({ result, score: scoreSearchResult(result, terms) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.result.date.localeCompare(a.result.date))
      .slice(0, config.maxArchiveResults)
      .map(({ result }) => result);
  }, [archiveResults, query, shouldSearchArchive]);

  const status = useMemo<ArchiveIndexStatus>(() => {
    if (!includeArchiveResults) {
      return {
        isEnabled: false,
        phase: "disabled",
        documentCount: 0,
        tocCount: 0,
        processedBooks: 0,
        totalBooks: 0,
      };
    }

    if (hasArchiveError) {
      return {
        isEnabled: true,
        phase: "error",
        documentCount: documentResults.length,
        tocCount: tocResults.length,
        processedBooks: tocProgress.processedBooks,
        totalBooks: tocProgress.totalBooks,
      };
    }

    if (isLoadingDocuments) {
      return {
        isEnabled: true,
        phase: "loading-documents",
        documentCount: documentResults.length,
        tocCount: tocResults.length,
        processedBooks: tocProgress.processedBooks,
        totalBooks: tocProgress.totalBooks,
      };
    }

    if (isBuildingToc) {
      return {
        isEnabled: true,
        phase: "building-toc",
        documentCount: documentResults.length,
        tocCount: tocResults.length,
        processedBooks: tocProgress.processedBooks,
        totalBooks: tocProgress.totalBooks,
      };
    }

    if (documentResults.length > 0 && tocResults.length > 0) {
      return {
        isEnabled: true,
        phase: "ready",
        documentCount: documentResults.length,
        tocCount: tocResults.length,
        processedBooks: tocProgress.processedBooks,
        totalBooks: tocProgress.totalBooks,
      };
    }

    return {
      isEnabled: true,
      phase: "idle",
      documentCount: documentResults.length,
      tocCount: tocResults.length,
      processedBooks: tocProgress.processedBooks,
      totalBooks: tocProgress.totalBooks,
    };
  }, [
    documentResults.length,
    hasArchiveError,
    includeArchiveResults,
    isBuildingToc,
    isLoadingDocuments,
    tocProgress,
    tocResults.length,
  ]);

  return { results, isLoading: includeArchiveResults && isLoadingDocuments, status };
}

function readCachedResults(key: string) {
  const cached = cache.get(key);
  if (!cached) {
    return [];
  }

  try {
    return JSON.parse(cached) as SearchResult[];
  } catch {
    cache.remove(key);
    return [];
  }
}

async function fetchArchiveDocumentResults() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARCHIVE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.archiveIndexUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Apple Developer archive request failed with status ${response.status}`);
    }

    const archive = parseArchiveLibrary(await response.text());
    const results = normalizeArchiveLibrary(archive);
    cache.set(ARCHIVE_DOCUMENTS_CACHE_KEY, JSON.stringify(results));

    return results;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildArchiveTocResults(
  documentResults: SearchResult[],
  signal: AbortSignal,
  onResultsProgress: (results: SearchResult[]) => void,
  onIndexProgress: (progress: { processedBooks: number; totalBooks: number }) => void
) {
  const bookCandidates = documentResults.filter(isBookCandidate);
  const results: SearchResult[] = [];
  let nextIndex = 0;
  let completedCount = 0;
  onIndexProgress({ processedBooks: 0, totalBooks: bookCandidates.length });

  async function worker() {
    for (;;) {
      if (signal.aborted) {
        return;
      }

      const document = bookCandidates[nextIndex];
      nextIndex += 1;

      if (!document) {
        return;
      }

      const tocResults = await fetchArchiveBookTocResults(document, signal);
      if (signal.aborted) {
        return;
      }

      results.push(...tocResults);
      completedCount += 1;
      onIndexProgress({ processedBooks: completedCount, totalBooks: bookCandidates.length });

      if (tocResults.length > 0 && completedCount % 20 === 0) {
        onResultsProgress([...results]);
      }
    }
  }

  await Promise.all(Array.from({ length: ARCHIVE_TOC_CONCURRENCY }, worker));
  if (signal.aborted) {
    return results;
  }

  onResultsProgress(results);
  cache.set(ARCHIVE_TOC_CACHE_KEY, JSON.stringify(results));

  return results;
}

async function fetchArchiveBookTocResults(document: SearchResult, signal: AbortSignal) {
  const bookIndexUrl = getBookIndexUrl(document.url);
  if (!bookIndexUrl) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARCHIVE_TOC_REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });

  try {
    if (signal.aborted) {
      return [];
    }

    const response = await fetch(bookIndexUrl, { signal: controller.signal });
    if (!response.ok) {
      return [];
    }

    const book = (await response.json()) as ArchiveBook;
    return flattenBookSections(book.sections ?? [], document, bookIndexUrl);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

function parseArchiveLibrary(raw: string) {
  return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1")) as ArchiveLibrary;
}

function normalizeArchiveLibrary(archive: ArchiveLibrary) {
  const resourceTypes = topicContentsByKey(archive.topics, "Resource Types");
  const topics = topicContentsByKey(archive.topics, "Topics");
  const technologies = topicContentsByKey(archive.topics, "Technologies");
  const columns = archive.columns;

  return archive.documents
    .map((document, order) => {
      const title = decodeHTML(String(document[columns.name] ?? ""));
      const resourceType = resourceTypes.get(String(document[columns.type])) ?? "Archive";
      const topic = topics.get(String(document[columns.topic])) ?? "";
      const technology = technologies.get(String(document[columns.framework])) ?? "";
      const platform = String(document[columns.platform] ?? "");
      const date = String(document[columns.displayDate] ?? document[columns.date] ?? "");
      const rawUrl = String(document[columns.url] ?? "");

      if (!rawUrl) {
        return undefined;
      }

      return {
        title,
        description: [resourceType, topic, technology].filter(Boolean).join(" · "),
        url: new URL(rawUrl, config.archiveNavigationUrl).href,
        type: "archive",
        order,
        platform: platform ? platform.split("|") : [],
        breadcrumbs: [topic, technology].filter(Boolean),
        date,
        event_name: "",
        session_id: String(document[columns.id] ?? ""),
        tile_image: "",
        relevance: 0,
        is_beta: 0,
        language: "",
        lang_children: [],
      } as SearchResult;
    })
    .filter((result): result is SearchResult => result !== undefined);
}

function flattenBookSections(sections: ArchiveBookSection[], document: SearchResult, bookIndexUrl: string) {
  const results: SearchResult[] = [];

  function visit(sectionList: ArchiveBookSection[], parents: string[]) {
    for (const section of sectionList) {
      const title = decodeHTML(section.title ?? "");
      const url = section.href ? new URL(section.href, bookIndexUrl).href : undefined;
      const breadcrumbs = [document.title, ...parents];

      if (title && url) {
        results.push({
          ...document,
          title,
          description: `${document.title} · Archive`,
          url,
          order: document.order,
          breadcrumbs,
          session_id: `${document.session_id}:${section.href}`,
        });
      }

      visit(section.sections ?? [], title ? [...parents, title] : parents);
    }
  }

  visit(sections, []);

  return results;
}

function topicContentsByKey(topics: ArchiveTopic[], name: string) {
  const contents = topics.find((topic) => topic.name === name)?.contents ?? [];
  return new Map(contents.map((content) => [content.key, decodeHTML(content.name)]));
}

function isBookCandidate(result: SearchResult) {
  const resourceType = result.description.split(" · ")[0];
  return ["Articles", "Getting Started", "Guides"].includes(resourceType) && getBookIndexUrl(result.url) !== undefined;
}

function getBookIndexUrl(url: string) {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const fileName = pathParts[pathParts.length - 1];

  if (!fileName?.endsWith(".html") || pathParts.length < 2) {
    return undefined;
  }

  pathParts.splice(pathParts.length - 2, 2, "book.json");
  parsedUrl.pathname = `/${pathParts.join("/")}`;
  parsedUrl.hash = "";
  parsedUrl.search = "";

  return parsedUrl.href;
}

function decodeHTML(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
