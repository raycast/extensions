import { Cache } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { config } from "../config";

const ARCHIVE_RESULTS_CACHE_KEY = "archive-results-v1";
const ARCHIVE_REQUEST_TIMEOUT_MS = 8000;
const cache = new Cache({ namespace: "apple-developer-docs-archive" });

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

export default function useArchiveResults(query: string, typeFilter: AllResultType | ResultType) {
  const [archiveResults, setArchiveResults] = useState<SearchResult[]>(() => readCachedResults());
  const [isLoading, setIsLoading] = useState(archiveResults.length === 0);
  const shouldSearchArchive = typeFilter === "all" || typeFilter === "archive";
  const shouldLoadArchive = shouldSearchArchive && query.trim().length > 1;

  useEffect(() => {
    if (!shouldLoadArchive || archiveResults.length > 0) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchArchiveResults()
      .then((results) => {
        if (!isMounted) {
          return;
        }

        setArchiveResults(results);
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [archiveResults.length, shouldLoadArchive]);

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
  }, [archiveResults, query, typeFilter]);

  return { results, isLoading };
}

function readCachedResults() {
  const cached = cache.get(ARCHIVE_RESULTS_CACHE_KEY);
  if (!cached) {
    return [];
  }

  try {
    return JSON.parse(cached) as SearchResult[];
  } catch {
    cache.remove(ARCHIVE_RESULTS_CACHE_KEY);
    return [];
  }
}

async function fetchArchiveResults() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARCHIVE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.archiveIndexUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Apple Developer archive request failed with status ${response.status}`);
    }

    const archive = parseArchiveLibrary(await response.text());
    const results = normalizeArchiveLibrary(archive);
    cache.set(ARCHIVE_RESULTS_CACHE_KEY, JSON.stringify(results));

    return results;
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
      platform: platform ? [platform] : [],
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

function topicContentsByKey(topics: ArchiveTopic[], name: string) {
  const contents = topics.find((topic) => topic.name === name)?.contents ?? [];
  return new Map(contents.map((content) => [content.key, decodeHTML(content.name)]));
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
