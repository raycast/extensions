import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import path from "node:path";
import { useCallback, useEffect, useState } from "react";
import {
  codexDocsUrl,
  loadCodexProjects,
  openProject,
  type CodexProject,
} from "./lib/codex";

export default function Command() {
  const [items, setItems] = useState<CodexProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const nextItems = await loadCodexProjects();
      setItems(nextItems);
      setSelectedItemId((current) => {
        if (nextItems.length === 0) return undefined;
        if (current && nextItems.some((item) => item.id === current))
          return current;
        return nextItems[0]?.id;
      });
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setItems([]);
      setSelectedItemId(undefined);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load Codex projects",
        message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <List
        isLoading={loading}
        searchBarPlaceholder="Codex projects unavailable"
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Codex projects not available"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
              <Action.OpenInBrowser
                title="Open Codex Docs"
                url={codexDocsUrl()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      onSelectionChange={setSelectedItemId}
      searchBarPlaceholder="Search Codex projects..."
    >
      {!loading && items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Codex projects found"
          description="Codex has not recorded any local workspaces yet in your current profile."
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
              <Action.OpenInBrowser
                title="Open Codex Docs"
                url={codexDocsUrl()}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {items.map((item) => (
        <List.Item
          id={item.id}
          key={item.id}
          title={item.name}
          accessories={[
            ...(selectedItemId === item.id
              ? [{ text: item.path, tooltip: item.path }]
              : []),
            ...(item.threadCount > 0
              ? [
                  {
                    text: `${item.threadCount} thread${item.threadCount === 1 ? "" : "s"}`,
                  },
                ]
              : []),
            ...(!item.pathAccessible
              ? [
                  {
                    icon: Icon.Warning,
                    tooltip:
                      "Raycast may not currently have permission to read this folder.",
                  },
                ]
              : []),
          ]}
          keywords={[item.path, path.basename(item.path), item.preview ?? ""]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Codex"
                icon={Icon.Terminal}
                onAction={async () => {
                  await openProject(item.path);
                }}
              />
              {item.remoteBrowserUrl ? (
                <Action.OpenInBrowser
                  title="Open Remote in Browser"
                  url={item.remoteBrowserUrl}
                  icon={Icon.Globe}
                />
              ) : null}
              <Action.CopyToClipboard title="Copy Path" content={item.path} />
              {item.pathAccessible ? (
                <Action.ShowInFinder title="Show in Finder" path={item.path} />
              ) : null}
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
