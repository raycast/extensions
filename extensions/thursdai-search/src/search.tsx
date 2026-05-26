import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

type SearchPreferences = Preferences.Search;

type SearchResponse = {
  query: string;
  results: SearchResult[];
};

type SearchResult = {
  title: string;
  date: string;
  url: string;
  substackUrl?: string;
  excerpt: string;
  source: "transcript" | "substack" | "episode";
  score: number;
  key: string;
  slug?: string;
  hasTranscript?: boolean;
  scoring?: {
    vector_score?: number;
    keyword_score?: number;
    vector_rank?: number;
    keyword_rank?: number;
    fusion_method?: string;
    reranking_score?: number;
    hybrid_score?: number;
    lexical_score?: number;
    recency_score?: number;
  };
};

type EpisodeDocument = {
  key: string;
  title: string;
  date: string;
  url: string;
  substackUrl?: string;
  text: string;
};

type SearchState = {
  results: SearchResult[];
  isLoading: boolean;
  error?: string;
};

const MIN_QUERY_LENGTH = 2;

export default function SearchEpisodes() {
  const preferences = getPreferenceValues<SearchPreferences>();
  const limit = Math.min(Math.max(Number(preferences.resultLimit) || 8, 1), 20);
  const [searchText, setSearchText] = useState("");
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
  });

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setState({ results: [], isLoading: false });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((current) => ({
        ...current,
        isLoading: true,
        error: undefined,
      }));
      try {
        const results = await searchEpisodes({
          apiBaseUrl: preferences.apiBaseUrl,
          apiKey: preferences.apiKey,
          limit,
          query,
          signal: controller.signal,
        });
        setState({ results, isLoading: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Search failed";
        setState({ results: [], isLoading: false, error: message });
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message,
        });
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [limit, preferences.apiBaseUrl, preferences.apiKey, searchText]);

  const emptyView = useMemo(() => {
    if (state.error) {
      return (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Search failed"
          description={state.error}
          actions={<PreferencesActionPanel />}
        />
      );
    }

    if (searchText.trim().length < MIN_QUERY_LENGTH) {
      return (
        <List.EmptyView
          icon={{ source: "assets/icon.png" }}
          title="Search ThursdAI"
          description="Search episode notes, Substack text, and transcripts."
        />
      );
    }

    return (
      <List.EmptyView
        icon={{ source: Icon.MagnifyingGlass }}
        title="No matches"
        description="Try a model, company, guest, product launch, or news phrase."
      />
    );
  }, [searchText, state.error]);

  return (
    <List
      isLoading={state.isLoading}
      filtering={false}
      searchBarPlaceholder="Search models, companies, guests, releases..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {state.results.length === 0
        ? emptyView
        : [
            <List.Section
              key="matches"
              title="Matches"
              subtitle={`${state.results.length} result${state.results.length === 1 ? "" : "s"}`}
            >
              {state.results.map((result) => (
                <EpisodeResultItem
                  key={result.key}
                  result={result}
                  query={searchText}
                  apiBaseUrl={preferences.apiBaseUrl}
                  apiKey={preferences.apiKey}
                />
              ))}
            </List.Section>,
          ]}
    </List>
  );
}

function EpisodeResultItem({
  result,
  query,
  apiBaseUrl,
  apiKey,
}: {
  result: SearchResult;
  query: string;
  apiBaseUrl: string;
  apiKey: string;
}) {
  const dateLabel = formatDate(result.date);
  const scoreLabel = scorePercent(result.score);
  const sourceLabel = sourceTitle(result.source);
  const title = `${dateLabel} · ${truncateText(episodeHeadline(result.title), 48)}`;
  const context = matchContext(result, query);

  return (
    <List.Item
      id={result.key}
      title={title}
      subtitle={context}
      icon={{
        source: result.hasTranscript ? Icon.TextDocument : Icon.Rss,
        tintColor: Color.Red,
      }}
      accessories={[
        result.hasTranscript
          ? {
              tag: { value: "Transcript", color: Color.Green },
              tooltip: "Transcript text matched or is available",
            }
          : {
              tag: { value: sourceLabel, color: Color.SecondaryText },
              tooltip: "Source",
            },
        {
          tag: { value: scoreLabel, color: Color.Red },
          tooltip: "Hybrid match score",
        },
      ]}
      actions={
        <ResultActions
          result={result}
          query={query}
          apiBaseUrl={apiBaseUrl}
          apiKey={apiKey}
        />
      }
    />
  );
}

function ResultActions({
  result,
  query,
  apiBaseUrl,
  apiKey,
  showDetails = true,
}: {
  result: SearchResult;
  query: string;
  apiBaseUrl: string;
  apiKey: string;
  showDetails?: boolean;
}) {
  const markdownLink = `[${episodeHeadline(result.title)}](${result.url})`;
  return (
    <ActionPanel>
      {showDetails ? (
        <Action.Push
          title="View Episode Details"
          icon={Icon.Sidebar}
          target={
            <MatchDetail
              result={result}
              query={query}
              apiBaseUrl={apiBaseUrl}
              apiKey={apiKey}
            />
          }
        />
      ) : null}
      <Action.OpenInBrowser
        title="Open Episode on Substack"
        url={result.substackUrl || result.url}
        icon={Icon.Globe}
      />
      <Action.CopyToClipboard
        title="Copy Episode Link"
        content={result.url}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Markdown Link"
        content={markdownLink}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Match Snippet"
        content={readableExcerpt(result) || result.excerpt}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <ActionPanel.Section>
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function MatchDetail({
  result,
  query,
  apiBaseUrl,
  apiKey,
}: {
  result: SearchResult;
  query: string;
  apiBaseUrl: string;
  apiKey: string;
}) {
  const [document, setDocument] = useState<EpisodeDocument | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    fetchEpisodeDocument({
      apiBaseUrl,
      apiKey,
      key: result.key,
      signal: controller.signal,
    })
      .then((episodeDocument) => {
        setDocument(episodeDocument);
        setError(undefined);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Episode document failed to load",
        );
      });

    return () => controller.abort();
  }, [apiBaseUrl, apiKey, result.key]);

  return (
    <Detail
      isLoading={!document && !error}
      markdown={resultMarkdown(result, query, document, error)}
      actions={
        <ResultActions
          result={result}
          query={query}
          apiBaseUrl={apiBaseUrl}
          apiKey={apiKey}
          showDetails={false}
        />
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Date"
            text={formatDate(result.date)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title="Source"
            text={sourceTitle(result.source)}
            icon={Icon.Text}
          />
          <Detail.Metadata.Label
            title="Score"
            text={scorePercent(result.score)}
            icon={Icon.Stars}
          />
          {typeof result.scoring?.vector_score === "number" ? (
            <Detail.Metadata.Label
              title="Vector"
              text={result.scoring.vector_score.toFixed(3)}
            />
          ) : null}
          {typeof result.scoring?.keyword_score === "number" ? (
            <Detail.Metadata.Label
              title="Keyword"
              text={result.scoring.keyword_score.toFixed(2)}
            />
          ) : null}
          {typeof result.scoring?.lexical_score === "number" ? (
            <Detail.Metadata.Label
              title="Exact Match"
              text={scorePercent(result.scoring.lexical_score)}
            />
          ) : null}
          {result.scoring?.fusion_method ? (
            <Detail.Metadata.Label
              title="Fusion"
              text={result.scoring.fusion_method.toUpperCase()}
            />
          ) : null}
          <Detail.Metadata.Link
            title="Episode"
            text="Open on Substack"
            target={result.substackUrl || result.url}
          />
        </Detail.Metadata>
      }
    />
  );
}

function PreferencesActionPanel() {
  return (
    <ActionPanel>
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

async function searchEpisodes({
  apiBaseUrl,
  apiKey,
  limit,
  query,
  signal,
}: {
  apiBaseUrl: string;
  apiKey: string;
  limit: number;
  query: string;
  signal: AbortSignal;
}): Promise<SearchResult[]> {
  const url = new URL(apiBaseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
  });

  if (response.status === 401) {
    throw new Error(
      "The API key was rejected. Update it in extension preferences.",
    );
  }
  if (!response.ok) {
    throw new Error(`The search API returned ${response.status}.`);
  }

  const data = (await response.json()) as SearchResponse;
  return Array.isArray(data.results) ? data.results : [];
}

async function fetchEpisodeDocument({
  apiBaseUrl,
  apiKey,
  key,
  signal,
}: {
  apiBaseUrl: string;
  apiKey: string;
  key: string;
  signal: AbortSignal;
}): Promise<EpisodeDocument> {
  const url = new URL(apiBaseUrl);
  url.pathname = url.pathname.replace(
    /\/api\/search\/?$/,
    "/api/search/document",
  );
  url.search = "";
  url.searchParams.set("key", key);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
  });

  if (response.status === 401) {
    throw new Error(
      "The API key was rejected. Update it in extension preferences.",
    );
  }
  if (!response.ok) {
    throw new Error(`The episode document API returned ${response.status}.`);
  }

  return (await response.json()) as EpisodeDocument;
}

function resultMarkdown(
  result: SearchResult,
  query: string,
  document: EpisodeDocument | null,
  error?: string,
): string {
  const title = escapeMarkdown(episodeHeadline(result.title));
  const snippet = highlightMarkdown(
    escapeMarkdown(readableExcerpt(result) || "No snippet returned."),
    query,
  );
  const stats = [
    `score ${scorePercent(result.score)}`,
    result.scoring?.fusion_method
      ? `${result.scoring.fusion_method.toUpperCase()} hybrid`
      : "hybrid",
    typeof result.scoring?.vector_rank === "number"
      ? `vector rank ${result.scoring.vector_rank}`
      : "",
    typeof result.scoring?.keyword_rank === "number"
      ? `keyword rank ${result.scoring.keyword_rank}`
      : "",
    typeof result.scoring?.lexical_score === "number"
      ? `keyword match ${scorePercent(result.scoring.lexical_score)}`
      : "",
  ].filter(Boolean);

  const header = [
    `# ${title}`,
    "",
    `**${formatDate(result.date)}** · ${sourceTitle(result.source)}${result.hasTranscript ? " · transcript available" : ""}`,
    "",
    `_${escapeMarkdown(stats.join(" · "))}_`,
  ];

  if (error) {
    return [
      ...header,
      "",
      "## Matched Chunk",
      "",
      snippet,
      "",
      "## Full Episode",
      "",
      `Could not load the full indexed episode: ${escapeMarkdown(error)}`,
    ].join("\n");
  }

  if (!document) {
    return [
      ...header,
      "",
      "## Matched Chunk",
      "",
      snippet,
      "",
      "## Full Episode",
      "",
      "Loading full indexed episode...",
    ].join("\n");
  }

  return [
    ...header,
    "",
    "## Matched Chunk",
    "",
    highlightMarkdown(matchWindow(document.text, query, result), query),
    "",
    "## Full Episode",
    "",
    highlightMarkdown(document.text, query),
  ].join("\n");
}

function readableExcerpt(result: SearchResult): string {
  let clean = result.excerpt.replace(/\s+/g, " ").trim();
  const exactTitle = result.title.replace(/\s+/g, " ").trim();
  if (exactTitle && clean.toLowerCase().startsWith(exactTitle.toLowerCase())) {
    clean = clean.slice(exactTitle.length).trim();
  }

  clean = clean
    .replace(
      /^(?:📅\s*)?ThursdAI\s*[-–—]\s*[^.?!]{8,220}?\s+Date:\s*\d{4}-\d{2}-\d{2}\s*/i,
      "",
    )
    .replace(/^Date:\s*\d{4}-\d{2}-\d{2}\s*/i, "")
    .replace(/^Episode\s*/i, "")
    .replace(/^URL:\s*\S+\s*/i, "")
    .replace(/^Subtitle:\s*/i, "")
    .trim();

  if (!clean) return `Title match: ${episodeHeadline(result.title)}`;
  if (/^[a-z]/.test(clean)) return `... ${clean}`;
  return clean;
}

function matchContext(result: SearchResult, query: string): string {
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]{1,}/gi) || []),
  ];
  const excerpt = readableExcerpt(result);
  const source = terms.some((term) =>
    excerpt.toLowerCase().includes(term.toLowerCase()),
  )
    ? excerpt
    : episodeHeadline(result.title);
  const lower = source.toLowerCase();
  const matchIndex = terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (typeof matchIndex !== "number") return truncateText(source, 118);

  const start = Math.max(0, matchIndex - 44);
  const end = Math.min(source.length, matchIndex + 96);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < source.length ? "..." : "";
  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function matchWindow(
  text: string,
  query: string,
  result: SearchResult,
): string {
  const clean = text.replace(/\r\n/g, "\n").trim();
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]{1,}/gi) || []),
  ];
  const lower = clean.toLowerCase();
  const excerpt = readableExcerpt(result).toLowerCase();
  const excerptIndex =
    excerpt.length > 20 ? lower.indexOf(excerpt.slice(0, 80)) : -1;
  const termIndex = terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const index = excerptIndex >= 0 ? excerptIndex : termIndex;

  if (typeof index !== "number") return readableExcerpt(result);

  const start = Math.max(0, index - 900);
  const end = Math.min(clean.length, index + 1800);
  const prefix = start > 0 ? "...\n\n" : "";
  const suffix = end < clean.length ? "\n\n..." : "";
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

function highlightMarkdown(snippet: string, query: string): string {
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]{1,}/gi) || []),
  ].slice(0, 8);
  if (terms.length === 0) return snippet;

  let highlighted = snippet;
  for (const term of terms) {
    const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
    highlighted = highlighted.replace(pattern, "**$1**");
  }
  return highlighted;
}

function formatDate(value: string): string {
  if (!value) return "Unknown date";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function episodeHeadline(title: string): string {
  const clean = title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const withoutBrand = clean.replace(/^ThursdAI\s*[-–—:]\s*/i, "").trim();
  const headline = withoutBrand
    .replace(
      /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\s*[-–—:]\s*/i,
      "",
    )
    .trim();
  return headline || clean;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function sourceTitle(source: SearchResult["source"]): string {
  if (source === "substack") return "Substack";
  if (source === "transcript") return "Transcript";
  return "Episode";
}

function scorePercent(score: number): string {
  if (!Number.isFinite(score)) return "0%";
  const normalized = score <= 1 ? score * 100 : score;
  return `${Math.max(0, Math.min(100, Math.round(normalized)))}%`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
