import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchProps,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  position: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
};

type SearchResponse = {
  query: string;
  results: SearchResult[];
  total_results: number;
};

type FetchResult = {
  url: string;
  final_url?: string;
  title?: string;
  description?: string;
  language?: string;
  author?: string;
  published_date?: string;
  text: string;
  latency_ms?: number;
  format?: string;
};

type FetchError = {
  url: string;
  error: string;
  status?: number;
};

type FetchResponse = {
  results: FetchResult[];
  errors: FetchError[];
};

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const preferences = useMemo(() => getPreferenceValues<Preferences.Search>(), []);
  const [query, setQuery] = useState(props.arguments.query ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const trimmedQuery = query.trim();
  const emptyView = useMemo(() => {
    if (isLoading) {
      return <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching TinyFish" />;
    }

    if (!trimmedQuery) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the web"
          description="Type a query to find results."
        />
      );
    }

    return <List.EmptyView icon={Icon.MagnifyingGlass} title="No results found" description="Try a different query." />;
  }, [isLoading, trimmedQuery]);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);

      try {
        const data = await searchTinyFish(trimmedQuery, preferences, controller.signal);
        setResults(data.results ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [preferences.apiKey, preferences.language, preferences.location, trimmedQuery]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search with TinyFish..."
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
    >
      {results.length === 0 ? (
        emptyView
      ) : (
        <List.Section title="Results" subtitle={`${results.length}`}>
          {results.map((result) => (
            <List.Item
              key={`${result.position}-${result.url}`}
              icon={Icon.Globe}
              title={result.title}
              subtitle={result.site_name}
              accessories={[{ text: getUrlAccessoryText(result.url) }]}
              detail={<List.Item.Detail markdown={formatResultMarkdown(result)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={result.url} />
                  <Action.Push
                    icon={Icon.Document}
                    title="Fetch Content"
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "f" },
                      Windows: { modifiers: ["ctrl"], key: "f" },
                    }}
                    target={<FetchedContent result={result} preferences={preferences} />}
                  />
                  <Action.CopyToClipboard title="Copy URL" content={result.url} />
                  <Action.CopyToClipboard title="Copy Markdown Link" content={`[${result.title}](${result.url})`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function FetchedContent({ result, preferences }: { result: SearchResult; preferences: Preferences.Search }) {
  const [page, setPage] = useState<FetchResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPage() {
      setIsLoading(true);
      setError(undefined);

      try {
        const data = await fetchTinyFishContent(result.url, preferences, controller.signal);
        const fetchedPage = data.results?.[0];
        const fetchError = data.errors?.[0];

        if (fetchedPage) {
          setPage(fetchedPage);
          return;
        }

        throw new Error(
          fetchError
            ? `${fetchError.error}${fetchError.status ? ` (${fetchError.status})` : ""}`
            : "No content returned",
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setPage(undefined);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchPage();

    return () => controller.abort();
  }, [preferences.apiKey, result.url]);

  const markdown = page
    ? formatFetchedContentMarkdown(page, result)
    : `# ${result.title}\n\n${error ? `Fetch failed: ${error}` : result.url}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="URL" text={page?.final_url ?? result.url} />
          {page?.author ? <Detail.Metadata.Label title="Author" text={page.author} /> : null}
          {page?.published_date ? <Detail.Metadata.Label title="Published" text={page.published_date} /> : null}
          {page?.language ? <Detail.Metadata.Label title="Language" text={page.language} /> : null}
          {page?.latency_ms ? <Detail.Metadata.Label title="Latency" text={`${page.latency_ms} ms`} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page?.final_url ?? result.url} />
          <Action.CopyToClipboard title="Copy Content" content={page?.text ?? ""} />
          <Action.CopyToClipboard title="Copy URL" content={page?.final_url ?? result.url} />
        </ActionPanel>
      }
    />
  );
}

async function searchTinyFish(
  query: string,
  preferences: Preferences.Search,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const url = new URL("https://api.search.tinyfish.ai");
  url.searchParams.set("query", query);

  if (preferences.location?.trim()) {
    url.searchParams.set("location", preferences.location.trim());
  }

  if (preferences.language?.trim()) {
    url.searchParams.set("language", preferences.language.trim());
  }

  const response = await fetch(url, {
    headers: {
      "X-API-Key": preferences.apiKey,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SearchResponse;
}

async function fetchTinyFishContent(
  url: string,
  preferences: Preferences.Search,
  signal: AbortSignal,
): Promise<FetchResponse> {
  const response = await fetch("https://api.fetch.tinyfish.ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": preferences.apiKey,
    },
    body: JSON.stringify({
      urls: [url],
      format: "markdown",
      links: false,
      image_links: false,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as FetchResponse;
}

function formatResultMarkdown(result: SearchResult) {
  const snippet = result.snippet ? `\n\n${result.snippet}` : "";
  const siteName = result.site_name ? `\n\n**Site:** ${result.site_name}` : "";

  return `# ${result.title}\n\n${result.url}${siteName}${snippet}`;
}

function getUrlAccessoryText(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "Unknown URL";
  }
}

function formatFetchedContentMarkdown(page: FetchResult, fallback: SearchResult) {
  const title = page.title ?? fallback.title;
  const description = page.description ? `\n\n${page.description}` : "";
  const source = page.final_url ?? page.url;

  return `# ${title}\n\n${source}${description}\n\n---\n\n${page.text}`;
}
