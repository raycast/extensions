import { Cache } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { config } from "../config";

const ARCHIVE_DOCUMENTS_CACHE_KEY = "archive-document-results-v1";
const ARCHIVE_TOC_CACHE_KEY = "archive-toc-results-v1";
const ARCHIVE_REQUEST_TIMEOUT_MS = 8000;
const ARCHIVE_TOC_REQUEST_TIMEOUT_MS = 5000;
const ARCHIVE_TOC_CONCURRENCY = 4;
const cache = new Cache({ namespace: "apple-developer-docs-archive", capacity: 25 * 1024 * 1024 });

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
  type?: string;
  sections?: ArchiveBookSection[];
};

export default function useArchiveResults(query: string, typeFilter: AllResultType | ResultType) {
  const [documentResults, setDocumentResults] = useState<SearchResult[]>(() =>
    readCachedResults(ARCHIVE_DOCUMENTS_CACHE_KEY)
  );
  const [tocResults, setTocResults] = useState<SearchResult[]>(() => readCachedResults(ARCHIVE_TOC_CACHE_KEY));
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(documentResults.length === 0);
  const [isBuildingToc, setIsBuildingToc] = useState(false);
  const shouldSearchArchive = typeFilter === "all" || typeFilter === "archive";
  const shouldLoadArchive = shouldSearchArchive && query.trim().length > 1;

  useEffect(() => {
    if (!shouldLoadArchive || documentResults.length > 0) {
      setIsLoadingDocuments(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDocuments(true);

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
          setIsLoadingDocuments(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentResults.length, shouldLoadArchive]);

  useEffect(() => {
    if (!shouldLoadArchive || documentResults.length === 0 || tocResults.length > 0 || isBuildingToc) {
      return;
    }

    let isMounted = true;
    setIsBuildingToc(true);

    buildArchiveTocResults(documentResults, (results) => {
      if (isMounted) {
        setTocResults(results);
      }
    })
      .then((results) => {
        if (!isMounted) {
          return;
        }

        setTocResults(results);
        setIsBuildingToc(false);
      })
      .catch(() => {
        if (isMounted) {
          setIsBuildingToc(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentResults, isBuildingToc, shouldLoadArchive, tocResults.length]);

  const archiveResults = useMemo(() => [...tocResults, ...documentResults], [documentResults, tocResults]);

  const results = useMemo(() => {
    if (!shouldSearchArchive) {
      return [];
    }

    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return [];
    }

    return archiveResults
      .map((result) => ({ result, score: scoreArchiveResult(result, terms) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.result.date.localeCompare(a.result.date))
      .slice(0, config.maxArchiveResults)
      .map(({ result }) => result);
  }, [archiveResults, query, shouldSearchArchive]);

  return { results, isLoading: isLoadingDocuments };
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

async function buildArchiveTocResults(documentResults: SearchResult[], onProgress: (results: SearchResult[]) => void) {
  const bookCandidates = documentResults.filter(isBookCandidate);
  const results: SearchResult[] = [];
  let nextIndex = 0;
  let completedCount = 0;

  async function worker() {
    for (;;) {
      const document = bookCandidates[nextIndex];
      nextIndex += 1;

      if (!document) {
        return;
      }

      const tocResults = await fetchArchiveBookTocResults(document);
      results.push(...tocResults);
      completedCount += 1;

      if (tocResults.length > 0 && completedCount % 20 === 0) {
        onProgress([...results]);
      }
    }
  }

  await Promise.all(Array.from({ length: ARCHIVE_TOC_CONCURRENCY }, worker));
  onProgress(results);
  cache.set(ARCHIVE_TOC_CACHE_KEY, JSON.stringify(results));

  return results;
}

async function fetchArchiveBookTocResults(document: SearchResult) {
  const bookIndexUrl = getBookIndexUrl(document.url);
  if (!bookIndexUrl) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARCHIVE_TOC_REQUEST_TIMEOUT_MS);

  try {
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

  return archive.documents.map((document, order) => {
    const title = decodeHTML(String(document[columns.name] ?? ""));
    const resourceType = resourceTypes.get(String(document[columns.type])) ?? "Archive";
    const topic = topics.get(String(document[columns.topic])) ?? "";
    const technology = technologies.get(String(document[columns.framework])) ?? "";
    const platform = String(document[columns.platform] ?? "");
    const date = String(document[columns.displayDate] ?? document[columns.date] ?? "");

    return {
      title,
      description: [resourceType, topic, technology].filter(Boolean).join(" · "),
      url: new URL(String(document[columns.url] ?? ""), config.archiveNavigationUrl).href,
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
  });
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

function scoreArchiveResult(result: SearchResult, terms: string[]) {
  const title = result.title.toLowerCase();
  const haystack = [result.title, result.description, result.platform.join(" "), result.breadcrumbs.join(" ")]
    .join(" ")
    .toLowerCase();

  if (!terms.every((term) => haystack.includes(term))) {
    return 0;
  }

  return terms.reduce((score, term) => {
    if (title === term) {
      return score + 100;
    }

    if (title.startsWith(term)) {
      return score + 50;
    }

    if (title.includes(term)) {
      return score + 20;
    }

    return score + 5;
  }, 0);
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
