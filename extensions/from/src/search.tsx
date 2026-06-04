import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  searchNodes,
  nodeDeepLink,
  nodeWebUrl,
  nodeTypes,
  type FromNode,
} from "./from-client";

export default function SearchCommand() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FromNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const nodes = await searchNodes(q);
        if (!cancelled) setResults(nodes);
      } catch (e) {
        if (!cancelled)
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: String(e),
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function iconFor(n: FromNode) {
    if (n.status === "pending") return Icon.Circle;
    if (n.status === "done") return Icon.CheckCircle;
    if (n.isEvent) return Icon.Calendar;
    return Icon.Document;
  }

  return (
    <List
      isLoading={loading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your From vault…"
      throttle
    >
      {results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query ? "No results" : "Type to search in From"}
        />
      ) : (
        results.map((n) => (
          <List.Item
            key={n.id}
            icon={iconFor(n)}
            title={n.text || "Untitled"}
            subtitle={nodeTypes(n)
              .map((t) => `@${t}`)
              .join(" ")}
            actions={
              <ActionPanel>
                <Action
                  title="Open in From (Mac)"
                  icon={Icon.AppWindow}
                  onAction={() => open(nodeDeepLink(n.id))}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={nodeWebUrl(n.id)}
                />
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={n.text || ""}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
