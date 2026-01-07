import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useCallback } from "react";
import { getUsememosClient, Memo } from "./api/usememos";

interface Preferences {
  syncServiceUrl?: string;
}

export default function SearchMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  const prefs = getPreferenceValues<Preferences>();
  const hasSemanticSearch = Boolean(prefs.syncServiceUrl);

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setMemos([]);
        return;
      }

      setIsLoading(true);
      try {
        if (useSemanticSearch && hasSemanticSearch) {
          // Semantic search via sync service
          const response = await fetch(`${prefs.syncServiceUrl}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit: 20 }),
          });

          if (!response.ok) {
            throw new Error("Semantic search failed");
          }

          const results = (await response.json()) as {
            memos: Memo[];
          };
          setMemos(results.memos);
        } else {
          // Text-based search via usememos API
          const client = getUsememosClient();
          const results = await client.searchMemos(query);
          setMemos(results);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String(error),
        });
        setMemos([]);
      } finally {
        setIsLoading(false);
      }
    },
    [useSemanticSearch, hasSemanticSearch, prefs.syncServiceUrl],
  );

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    // Debounce search
    const timeoutId = setTimeout(() => performSearch(text), 300);
    return () => clearTimeout(timeoutId);
  };

  const getPreviewText = (content: string): string => {
    const lines = content.split("\n").filter((line) => line.trim());
    return lines[0]?.slice(0, 100) || "Empty memo";
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder={
        useSemanticSearch ? "Semantic search..." : "Search memos..."
      }
      searchBarAccessory={
        hasSemanticSearch ? (
          <List.Dropdown
            tooltip="Search Mode"
            value={useSemanticSearch ? "semantic" : "text"}
            onChange={(value) => setUseSemanticSearch(value === "semantic")}
          >
            <List.Dropdown.Item title="Text Search" value="text" />
            <List.Dropdown.Item title="Semantic Search" value="semantic" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {searchText.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your memos"
          description={
            hasSemanticSearch
              ? "Type to search. Toggle between text and semantic search."
              : "Type to search by content"
          }
        />
      ) : memos.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={`No memos found for "${searchText}"`}
        />
      ) : (
        memos.map((memo) => (
          <List.Item
            key={memo.name}
            icon={Icon.Document}
            title={getPreviewText(memo.content)}
            subtitle={memo.tags?.map((t) => `#${t}`).join(" ")}
            accessories={[
              {
                date: new Date(memo.updateTime),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<MemoDetailView memo={memo} />}
                />
                <Action.CopyToClipboard
                  title="Copy Content"
                  content={memo.content}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={getUsememosClient().getWebUrl(memo)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function MemoDetailView({ memo }: { memo: Memo }) {
  return (
    <List>
      <List.Item
        title=""
        detail={
          <List.Item.Detail
            markdown={memo.content}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(memo.createTime).toLocaleString()}
                />
                <List.Item.Detail.Metadata.Label
                  title="Updated"
                  text={new Date(memo.updateTime).toLocaleString()}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
