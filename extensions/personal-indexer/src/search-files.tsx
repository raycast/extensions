import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { recentFiles, searchFiles, ServiceDownError, type FileHit } from "./api";

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FileHit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setIsLoading(true);
    const run = async () => {
      try {
        const next = query.trim() ? await searchFiles(query) : await recentFiles();
        if (id !== requestId.current) return;
        setItems(next);
        setError(null);
        setServiceDown(false);
      } catch (caught) {
        if (id !== requestId.current) return;
        setItems([]);
        setServiceDown(caught instanceof ServiceDownError);
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    };
    void run();
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search files by meaning"
      isShowingDetail={items.length > 0}
    >
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          title={serviceDown ? "Indexer is not running" : error ? "Search failed" : query.trim() ? "No matching files" : "No files yet"}
          description={
            serviceDown
              ? "Start it with npm run service from the personal-indexer repo."
              : error
                ? error
                : query.trim()
                  ? "Try a different query."
                  : "Add a folder from Indexer Status."
          }
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={item.path}
            title={item.name}
            subtitle={directoryOf(item.path)}
            icon={{ fileIcon: item.path }}
            accessories={accessories(item)}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Path" text={item.path} />
                    {item.tags.length > 0 ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {item.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title="Open" target={item.path} />
                <Action.ShowInFinder path={item.path} />
                <Action.CopyToClipboard title="Copy Path" content={item.path} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function accessories(item: FileHit): List.Item.Accessory[] {
  const tags = item.tags.map((tag) => ({ tag }));
  const match = item.match ? [{ text: item.match }] : [];
  const year = item.year ? [{ text: String(item.year) }] : [];
  if (typeof item.score !== "number") return [...tags, ...match, ...year];
  const percent = Math.round(Math.max(0, Math.min(1, item.score)) * 100);
  return [...tags, ...match, ...year, { text: `${percent}%` }];
}

function detailMarkdown(item: FileHit): string {
  const snippet = (item.snippet || "No preview").replaceAll("```", "'''");
  return ["```text", snippet, "```", "", `\`${item.path}\``].join("\n");
}

function directoryOf(filePath: string): string {
  const index = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return index <= 0 ? filePath : filePath.slice(0, index);
}
