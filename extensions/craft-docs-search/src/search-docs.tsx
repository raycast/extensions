import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  CraftConnection,
  CraftDocument,
  CraftDocumentResult,
  buildCraftUrl,
  collectMarkdown,
  extractTags,
  fetchActiveDocuments,
  fetchConnectionMetadata,
  searchDocuments,
} from "./craft-api";

type Preferences = {
  apiEndpoint: string;
  apiToken?: string;
};

type LoadState = {
  isLoading: boolean;
  results: CraftDocumentResult[];
  error?: string;
};

export default function SearchDocs() {
  const [searchText, setSearchText] = useState("");
  const [state, setState] = useState<LoadState>({
    isLoading: true,
    results: [],
  });
  const connection = useMemo(() => getCraftConnection(), []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadResults(searchText, connection, setState);
    }, 180);

    return () => clearTimeout(timeout);
  }, [connection, searchText]);

  if (state.error) {
    return <ErrorDetail message={state.error} />;
  }

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search docs by title, or use #tag"
      throttle
    >
      {state.results.map((result) => (
        <List.Item
          key={result.id}
          title={result.title}
          subtitle={
            result.matchingTags?.length
              ? result.matchingTags.map((tag) => `#${tag}`).join(" ")
              : result.snippet
          }
          accessories={[
            ...(result.spaceName ? [{ text: result.spaceName }] : []),
            ...(result.lastModifiedAt
              ? [{ date: new Date(result.lastModifiedAt) }]
              : []),
          ]}
          icon={Icon.Document}
          actions={<CraftActions result={result} />}
        />
      ))}
    </List>
  );
}

function CraftActions({ result }: { result: CraftDocumentResult }) {
  return (
    <ActionPanel>
      <Action
        title="Open in Craft"
        icon={Icon.ArrowRight}
        onAction={() => openCraftResult(result)}
      />
      {result.url ? (
        <Action
          title="Copy Craft Link"
          icon={Icon.Clipboard}
          onAction={() => copyCraftLink(result)}
        />
      ) : null}
    </ActionPanel>
  );
}

function ErrorDetail({ message }: { message: string }) {
  return (
    <Detail
      markdown={`# Craft Docs Search\n\n${message}\n\nOpen the extension preferences and verify the Craft API URL. If this API connection requires an API key, verify the token too.`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

async function loadResults(
  searchText: string,
  connection: CraftConnection,
  setState: (state: LoadState) => void,
): Promise<void> {
  const query = searchText.trim();
  const isTagSearch = query.startsWith("#");

  setState({ isLoading: true, results: [] });

  try {
    const results = isTagSearch
      ? await runTagSearch(connection, query)
      : await runTitleSearch(connection, query);

    setState({
      isLoading: false,
      results: dedupeResults(results),
    });
  } catch (error) {
    setState({
      isLoading: false,
      results: [],
      error:
        error instanceof Error ? error.message : "Unknown Craft API error.",
    });
  }
}

async function runTitleSearch(
  connection: CraftConnection,
  query: string,
): Promise<CraftDocumentResult[]> {
  const [metadata, documents] = await Promise.all([
    fetchConnectionMetadata(connection),
    fetchActiveDocuments(connection),
  ]);
  const normalizedQuery = query.toLowerCase();

  return documents
    .filter(
      (document) =>
        !normalizedQuery ||
        document.title.toLowerCase().includes(normalizedQuery),
    )
    .sort(sortDocumentsByModifiedDate)
    .slice(0, 50)
    .map((document) => ({
      id: document.id,
      title: document.title,
      spaceName: metadata.space?.name,
      lastModifiedAt: document.lastModifiedAt,
      createdAt: document.createdAt,
      url: buildCraftUrl(document, metadata),
    }));
}

async function runTagSearch(
  connection: CraftConnection,
  query: string,
): Promise<CraftDocumentResult[]> {
  const tagPrefix = query.slice(1).trim().toLowerCase();

  if (!tagPrefix) {
    return [];
  }

  const regexp = `#${escapeRegexp(tagPrefix)}[A-Za-z0-9_/-]*`;
  const params = new URLSearchParams({
    regexps: regexp,
    fetchBlocks: "true",
  });

  const [metadata, documents, searchItems] = await Promise.all([
    fetchConnectionMetadata(connection),
    fetchActiveDocuments(connection),
    searchDocuments(connection, params),
  ]);
  const documentById = new Map(
    documents.map((document) => [document.id, document]),
  );

  const results: CraftDocumentResult[] = [];

  for (const item of searchItems) {
    const document = documentById.get(item.documentId);

    if (!document) {
      continue;
    }

    const markdown = collectMarkdown(item);
    const matchingTags = extractTags(markdown).filter((tag) =>
      tag.toLowerCase().startsWith(tagPrefix),
    );

    if (!matchingTags.length) {
      continue;
    }

    results.push({
      id: document.id,
      title: document.title,
      spaceName: metadata.space?.name,
      lastModifiedAt: item.lastModifiedAt ?? document.lastModifiedAt,
      createdAt: item.createdAt ?? document.createdAt,
      url: buildCraftUrl(document, metadata),
      matchingTags,
      snippet: cleanSnippet(item.markdown),
    });
  }

  return results.sort(sortResultsByModifiedDate);
}

function getCraftConnection(): CraftConnection {
  const preferences = getPreferenceValues<Preferences>();

  return {
    endpoint: preferences.apiEndpoint,
    token: preferences.apiToken?.trim() || undefined,
  };
}

function dedupeResults(results: CraftDocumentResult[]): CraftDocumentResult[] {
  const seen = new Set<string>();
  const deduped: CraftDocumentResult[] = [];

  for (const result of results) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      deduped.push(result);
    }
  }

  return deduped;
}

function sortDocumentsByModifiedDate(
  a: CraftDocument,
  b: CraftDocument,
): number {
  return getTime(b.lastModifiedAt) - getTime(a.lastModifiedAt);
}

function sortResultsByModifiedDate(
  a: CraftDocumentResult,
  b: CraftDocumentResult,
): number {
  return getTime(b.lastModifiedAt) - getTime(a.lastModifiedAt);
}

function getTime(value: string | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function escapeRegexp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanSnippet(value: string | undefined): string | undefined {
  return value?.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

async function openCraftResult(result: CraftDocumentResult): Promise<void> {
  if (!result.url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Craft URL",
      message: "Craft did not return an openable URL.",
    });
    return;
  }

  await open(result.url);
}

async function copyCraftLink(result: CraftDocumentResult): Promise<void> {
  if (!result.url) {
    return;
  }

  await Clipboard.copy(result.url);
  await showToast({ style: Toast.Style.Success, title: "Copied Craft link" });
}
