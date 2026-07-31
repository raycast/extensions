import { Icon, List } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedNodeCount, listRecentNodes, searchIncompleteNodes, searchNodes } from "../lib/cache";
import { maybeStartBackgroundSync } from "../lib/sync";
import { truncate, type WorkflowyNodeRecord } from "../lib/nodes";
import { NodeActions } from "./NodeActions";

interface Props {
  onlyIncomplete?: boolean;
}

export function NodesListView({ onlyIncomplete = false }: Props) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<WorkflowyNodeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadResults = useCallback(() => {
    const query = searchText.trim();
    const nextResults = onlyIncomplete
      ? searchIncompleteNodes(query)
      : query
        ? searchNodes(query)
        : listRecentNodes();
    setResults(nextResults);
  }, [onlyIncomplete, searchText]);

  const latestLoadResults = useRef(loadResults);

  useEffect(() => {
    latestLoadResults.current = loadResults;
  }, [loadResults]);

  useEffect(() => {
    loadResults();
    setIsLoading(false);
  }, [loadResults]);

  useEffect(() => {
    const syncPromise = maybeStartBackgroundSync((event) => {
      if (event.type === "progress" && event.message) setSyncMessage(event.message);
      if (event.type === "done") {
        setSyncMessage(`Synced ${event.nodeCount ?? 0} items`);
        latestLoadResults.current();
      }
    });

    if (syncPromise) {
      setIsLoading(getCachedNodeCount() === 0);
      syncPromise
        .then(() => latestLoadResults.current())
        .catch((error) => setSyncMessage(error instanceof Error ? error.message : String(error)))
        .finally(() => setIsLoading(false));
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={false}
      searchBarPlaceholder={onlyIncomplete ? "Search incomplete Workflowy items" : "Search Workflowy"}
      onSearchTextChange={setSearchText}
      throttle
    >
      {syncMessage ? <List.EmptyView title={results.length ? "" : "No items yet"} description={syncMessage} /> : null}
      {results.map((node) => {
        const accessories = [] as List.Item.Accessory[];
        if (node.note) accessories.push({ text: truncate(node.note, 40), tooltip: node.note });
        if (node.completed > 0) accessories.push({ icon: Icon.CheckCircle, tooltip: "Completed" });

        return (
          <List.Item
            key={node.id}
            icon={node.completed > 0 ? Icon.CheckCircle : Icon.BulletPoints}
            title={node.name || "(Untitled)"}
            subtitle={truncate(node.path, 60)}
            accessories={accessories}
            actions={<NodeActions node={node} onDidMutate={loadResults} primaryAction={onlyIncomplete ? "toggleComplete" : "open"} />}
          />
        );
      })}
    </List>
  );
}
