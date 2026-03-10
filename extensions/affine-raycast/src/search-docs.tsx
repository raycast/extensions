import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  docUrl,
  desktopAppUrl,
  searchAllWorkspaces,
  type SearchResult,
} from "./affine-api";

export default function SearchDocsCommand() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { baseUrl, apiToken } = getPreferenceValues<{
    baseUrl: string;
    apiToken: string;
  }>();

  useEffect(() => {
    if (!query.trim() || !apiToken) {
      setResults([]);
      if (!apiToken) setError("Set API Token in extension preferences.");
      return;
    }
    setError(null);
    setLoading(true);
    searchAllWorkspaces(baseUrl, apiToken, query, 30)
      .then(setResults)
      .catch((e) => {
        setError(e.message);
        setResults([]);
        showToast(Toast.Style.Failure, "Search failed", e.message);
      })
      .finally(() => setLoading(false));
  }, [query, baseUrl, apiToken]);

  const totalDocs = results.reduce((n, r) => n + r.docs.length, 0);

  return (
    <List
      searchBarPlaceholder="Search AFFiNE documents..."
      onSearchTextChange={setQuery}
      isLoading={loading}
      throttle
    >
      {error && <List.EmptyView title="Error" description={error} icon="⚠️" />}
      {!error && query.trim() && totalDocs === 0 && !loading && (
        <List.EmptyView
          title="No documents found"
          description={`No results for "${query}"`}
        />
      )}
      {!error && !query.trim() && (
        <List.EmptyView
          title="Search AFFiNE"
          description="Enter a search term to find documents across your workspaces"
        />
      )}
      {results.map(({ workspaceId, docs }) =>
        docs.map((doc) => {
          const url = docUrl(baseUrl, workspaceId, doc.docId);
          const desktopUrl = desktopAppUrl(baseUrl, workspaceId, doc.docId);
          return (
            <List.Item
              key={`${workspaceId}-${doc.docId}`}
              title={doc.title || "Untitled"}
              subtitle={doc.highlight ?? undefined}
              accessories={[
                { text: new Date(doc.updatedAt).toLocaleDateString() },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={desktopUrl}
                    title="Open in Desktop App"
                  />
                  <Action.OpenInBrowser url={url} title="Open in Browser" />
                  <Action.CopyToClipboard
                    content={desktopUrl}
                    title="Copy Desktop App URL"
                  />
                  <Action.CopyToClipboard
                    content={url}
                    title="Copy Affine URL"
                  />
                </ActionPanel>
              }
            />
          );
        }),
      )}
    </List>
  );
}
