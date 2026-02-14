import { ActionPanel, Action, List, Icon, Color, Detail } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  searchMemories,
  listMemories,
  type SearchResult,
  type SearchMemory,
  type ListMemory,
} from "./api";

function scoreColor(score: number): Color {
  if (score >= 0.8) return Color.Green;
  if (score >= 0.5) return Color.Orange;
  return Color.SecondaryText;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const trimmed = text.substring(0, max);
  const lastSpace = trimmed.lastIndexOf(" ");
  return (
    (lastSpace > max * 0.6 ? trimmed.substring(0, lastSpace) : trimmed) + "..."
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- Search result detail ---

function SearchMemoryDetail({
  memory,
  score,
}: {
  memory: SearchMemory;
  score?: number;
}) {
  const md = [
    `# ${memory.title || "Untitled"}`,
    "",
    memory.content,
    "",
    "---",
    "",
    score !== undefined ? `**Relevance:** ${(score * 100).toFixed(0)}%` : "",
    memory.labels?.length ? `**Labels:** ${memory.labels.join(", ")}` : "",
    memory.unit_type ? `**Type:** ${memory.unit_type}` : "",
    memory.created_at ? `**Created:** ${formatDate(memory.created_at)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={memory.content}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={memory.title || ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Open
            title="Open in Nowledge Mem"
            target={`nowledgemem://memory/${memory.id}`}
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

// --- Recent memory detail ---

function ListMemoryDetail({ memory }: { memory: ListMemory }) {
  const md = [
    `# ${memory.title || "Untitled"}`,
    "",
    memory.content,
    "",
    "---",
    "",
    memory.time ? `**Saved:** ${memory.time}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={memory.content}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={memory.title || ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Open
            title="Open in Nowledge Mem"
            target={`nowledgemem://memory/${memory.id}`}
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

// --- Main command ---

export default function SearchMemories() {
  const [searchText, setSearchText] = useState("");

  const { isLoading: searchLoading, data: searchResults } = useCachedPromise(
    async (query: string) => {
      if (!query) return null;
      return searchMemories(query, 15);
    },
    [searchText],
    { keepPreviousData: true },
  );

  const { isLoading: recentLoading, data: recentMemories } = useCachedPromise(
    async () => listMemories(15),
    [],
  );

  const isLoading = searchText ? searchLoading : recentLoading;

  // --- Search results view ---
  if (searchText && searchResults) {
    return (
      <List
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search your knowledge base..."
        throttle
      >
        <List.Section
          title="Results"
          subtitle={`${searchResults.length} memories`}
        >
          {searchResults.map((result: SearchResult) => (
            <List.Item
              key={result.memory.id}
              icon={Icon.Dot}
              title={result.memory.title || "Untitled"}
              subtitle={truncate(result.memory.content, 60)}
              accessories={[
                ...(result.memory.labels?.length
                  ? [{ tag: result.memory.labels[0] }]
                  : []),
                {
                  tag: {
                    value: `${(result.similarity_score * 100).toFixed(0)}%`,
                    color: scoreColor(result.similarity_score),
                  },
                },
                ...(result.memory.created_at
                  ? [{ text: formatDate(result.memory.created_at) }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Memory"
                    icon={Icon.Eye}
                    target={
                      <SearchMemoryDetail
                        memory={result.memory}
                        score={result.similarity_score}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Content"
                    content={result.memory.content}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={result.memory.title || ""}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Open
                    title="Open in Nowledge Mem"
                    target={`nowledgemem://memory/${result.memory.id}`}
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // --- Recent memories view ---
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your knowledge base..."
      throttle
    >
      <List.Section
        title="Recent Memories"
        subtitle={`${recentMemories?.length ?? 0} memories`}
      >
        {(recentMemories ?? []).map((memory: ListMemory) => (
          <List.Item
            key={memory.id}
            icon={Icon.Dot}
            title={memory.title || "Untitled"}
            subtitle={truncate(memory.content, 60)}
            accessories={[
              ...(memory.is_favorite ? [{ icon: Icon.Star }] : []),
              { text: memory.time },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Memory"
                  icon={Icon.Eye}
                  target={<ListMemoryDetail memory={memory} />}
                />
                <Action.CopyToClipboard
                  title="Copy Content"
                  content={memory.content}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={memory.title || ""}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.Open
                  title="Open in Nowledge Mem"
                  target={`nowledgemem://memory/${memory.id}`}
                  icon={Icon.AppWindow}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
