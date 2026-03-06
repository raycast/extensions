import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { apiDelete, getBaseUrl, TypeWhisperError } from "./api";
import type { HistoryResponse } from "./types";

const PAGE_SIZE = 50;

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (searchText.trim()) {
    params.set("q", searchText.trim());
  }

  const { isLoading, data, revalidate } = useFetch<HistoryResponse>(
    `${getBaseUrl()}/v1/history?${params.toString()}`,
    { keepPreviousData: true },
  );

  async function deleteEntry(id: string) {
    if (
      await confirmAlert({
        title: "Delete Transcription",
        message: "This cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await apiDelete("/v1/history", { id });
        await showToast({ style: Toast.Style.Success, title: "Deleted" });
        revalidate();
      } catch (error) {
        const msg =
          error instanceof TypeWhisperError
            ? error.message
            : "Failed to delete";
        await showToast({ style: Toast.Style.Failure, title: msg });
      }
    }
  }

  const entries = data?.entries ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search transcriptions..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title={
            searchText ? "No matching transcriptions" : "No transcriptions yet"
          }
          description={
            searchText
              ? "Try a different search term"
              : "Start dictating to see history here"
          }
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        entries.map((entry) => (
          <List.Item
            key={entry.id}
            title={
              entry.text.length > 80
                ? entry.text.substring(0, 80) + "..."
                : entry.text
            }
            subtitle={entry.app_name ?? undefined}
            icon={
              entry.app_bundle_id && entry.app_name?.trim()
                ? {
                    fileIcon: `/Applications/${entry.app_name.trim()}.app`,
                  }
                : Icon.Microphone
            }
            accessories={[
              { text: formatDuration(entry.duration), icon: Icon.Clock },
              { text: formatRelativeDate(entry.timestamp) },
            ]}
            detail={
              <List.Item.Detail
                markdown={entry.text}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Words"
                      text={String(entry.words_count)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={formatDuration(entry.duration)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Engine"
                      text={entry.engine}
                    />
                    {entry.model && (
                      <List.Item.Detail.Metadata.Label
                        title="Model"
                        text={entry.model}
                      />
                    )}
                    {entry.language && (
                      <List.Item.Detail.Metadata.Label
                        title="Language"
                        text={entry.language}
                      />
                    )}
                    {entry.app_name && (
                      <List.Item.Detail.Metadata.Label
                        title="App"
                        text={entry.app_name}
                      />
                    )}
                    {entry.app_url && (
                      <List.Item.Detail.Metadata.Link
                        title="URL"
                        text={entry.app_url}
                        target={entry.app_url}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Timestamp"
                      text={new Date(entry.timestamp).toLocaleString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={entry.text}
                />
                <Action.Paste title="Paste Text" content={entry.text} />
                {entry.raw_text !== entry.text && (
                  <Action.CopyToClipboard
                    title="Copy Raw Text"
                    content={entry.raw_text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
                {entry.app_url && (
                  <Action.OpenInBrowser
                    title="Open URL"
                    url={entry.app_url}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                )}
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteEntry(entry.id)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
