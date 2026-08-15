import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Detail,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
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

function unitTypeIcon(unitType?: string): Icon {
  switch (unitType) {
    case "insight":
      return Icon.LightBulb;
    case "decision":
      return Icon.Hammer;
    case "experience":
      return Icon.Book;
    case "fact":
      return Icon.Document;
    case "procedure":
      return Icon.List;
    case "preference":
      return Icon.Heart;
    default:
      return Icon.MemoryChip;
  }
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
  if (diffMs < 0) return "Today";
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relevanceLabel(score: number): string {
  if (score >= 0.9) return "Excellent";
  if (score >= 0.7) return "Strong";
  if (score >= 0.5) return "Good";
  if (score >= 0.3) return "Partial";
  return "Weak";
}

// --- Search result detail ---

function SearchMemoryDetail({
  memory,
  score,
}: {
  memory: SearchMemory;
  score?: number;
}) {
  return (
    <Detail
      markdown={memory.content}
      metadata={
        <Detail.Metadata>
          {score !== undefined && (
            <Detail.Metadata.Label
              title="Relevance"
              text={`${(score * 100).toFixed(0)}% — ${relevanceLabel(score)}`}
              icon={score >= 0.5 ? Icon.CheckCircle : Icon.Circle}
            />
          )}
          {memory.unit_type && (
            <Detail.Metadata.Label
              title="Type"
              text={memory.unit_type}
              icon={unitTypeIcon(memory.unit_type)}
            />
          )}
          {memory.created_at && (
            <Detail.Metadata.Label
              title="Created"
              text={formatFullDate(memory.created_at)}
              icon={Icon.Calendar}
            />
          )}
          {memory.labels?.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Labels">
                {memory.labels.map((label) => (
                  <Detail.Metadata.TagList.Item
                    key={label}
                    text={label}
                    color={Color.Blue}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open in App"
            text="Nowledge Mem"
            target={`nowledgemem://memory/${memory.id}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={memory.content}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={memory.title || ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
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
  return (
    <Detail
      markdown={memory.content}
      metadata={
        <Detail.Metadata>
          {memory.confidence > 0 && (
            <Detail.Metadata.Label
              title="Confidence"
              text={`${(memory.confidence * 100).toFixed(0)}%`}
              icon={Icon.Signal3}
            />
          )}
          {memory.rating > 0 && (
            <Detail.Metadata.Label
              title="Importance"
              text={
                memory.rating >= 0.8
                  ? "High"
                  : memory.rating >= 0.5
                    ? "Normal"
                    : "Low"
              }
              icon={memory.rating >= 0.8 ? Icon.ExclamationMark : Icon.Minus}
            />
          )}
          {memory.time && (
            <Detail.Metadata.Label
              title="Saved"
              text={memory.time}
              icon={Icon.Calendar}
            />
          )}
          {memory.source && (
            <Detail.Metadata.Label
              title="Source"
              text={memory.source}
              icon={Icon.Globe}
            />
          )}
          {memory.label_ids?.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Labels">
                {memory.label_ids.map((label) => (
                  <Detail.Metadata.TagList.Item
                    key={label}
                    text={label}
                    color={Color.Blue}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open in App"
            text="Nowledge Mem"
            target={`nowledgemem://memory/${memory.id}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={memory.content}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={memory.title || ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
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

  const {
    isLoading: searchLoading,
    data: searchResults,
    error: searchError,
  } = useCachedPromise(
    async (query: string) => {
      if (!query) return null;
      return searchMemories(query, 15);
    },
    [searchText],
    { keepPreviousData: true },
  );

  const {
    isLoading: recentLoading,
    data: recentMemories,
    error: recentError,
  } = useCachedPromise(async () => listMemories(15), []);

  const isLoading = searchText ? searchLoading : recentLoading;

  useEffect(() => {
    const error = searchText ? searchError : recentError;
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: error.message,
      });
    }
  }, [searchError, recentError, searchText]);

  const highRelevanceResults = searchResults?.filter(
    (r) => r.similarity_score >= 0.5,
  );

  async function copyHighRelevance() {
    if (!highRelevanceResults?.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No results above 50%",
      });
      return;
    }
    const text = highRelevanceResults
      .map((r) => {
        const title = r.memory.title || "Untitled";
        const score = `${(r.similarity_score * 100).toFixed(0)}%`;
        return `## ${title} (${score})\n\n${r.memory.content}`;
      })
      .join("\n\n---\n\n");
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${highRelevanceResults.length} memories`,
      message: "All results with relevance above 50%",
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your knowledge base..."
      throttle
    >
      {searchText ? (
        <List.Section
          title="Results"
          subtitle={`${searchResults?.length ?? 0} memories${highRelevanceResults?.length ? ` · ${highRelevanceResults.length} above 50%` : ""}`}
        >
          {(searchResults ?? []).map((result: SearchResult) => (
            <List.Item
              key={result.memory.id}
              icon={{
                source: unitTypeIcon(result.memory.unit_type),
                tintColor: scoreColor(result.similarity_score),
              }}
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
                  <Action
                    title={`Copy All Above 50% (${highRelevanceResults?.length ?? 0})`}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={copyHighRelevance}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={result.memory.title || ""}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
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
      ) : (
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
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
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
      )}
    </List>
  );
}
