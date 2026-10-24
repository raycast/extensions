import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { listCards, Card, RecallError } from "./api";
import { formatDate, useDebounced } from "./utils";
import { CardDetailPage, ChunkSearchPage } from "./detail";

const DATE_PRESETS = [
  { title: "All time", value: "" },
  { title: "Today", value: "today" },
  { title: "Last 7 days", value: "week" },
  { title: "Last 30 days", value: "month" },
];

function dateRange(preset: string): { dateFrom?: string } {
  if (!preset) return {};
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (preset === "week") start.setDate(start.getDate() - 6);
  if (preset === "month") start.setDate(start.getDate() - 29);
  return { dateFrom: start.toISOString() };
}

function CardActions(props: { card: Card }) {
  const { card } = props;
  return (
    <ActionPanel>
      {card.source_url && (
        <>
          <Action.OpenInBrowser title="Open Source URL" url={card.source_url} />
          <Action.CopyToClipboard title="Copy Source URL" content={card.source_url} />
        </>
      )}
      <Action.Push title="Read Card" icon={Icon.TextDocument} target={<CardDetailPage cardId={card.id} />} />
      <Action.Push
        title="Ask This Card"
        icon={Icon.Message}
        target={<ChunkSearchPage cardId={card.id} cardTitle={card.title} />}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const [datePreset, setDatePreset] = useState("");
  const [searchText, setSearchText] = useState("");
  const urlFilter = useDebounced(searchText.trim());

  const {
    data: cards,
    isLoading,
    error,
  } = usePromise(listCards, [{ ...dateRange(datePreset), sourceUrlContains: urlFilter || undefined }]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by source URL…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by date" value={datePreset} onChange={setDatePreset}>
          {DATE_PRESETS.map((p) => (
            <List.Dropdown.Item key={p.value} title={p.title} value={p.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load cards"
          description={error instanceof RecallError ? error.message : String(error)}
        />
      ) : (
        <>
          {!isLoading && (
            <List.EmptyView
              title={urlFilter ? "No cards match this filter" : "No cards yet"}
              description={urlFilter ? undefined : "Save content in Recall, then it appears here"}
            />
          )}
          {cards?.map((card) => (
            <List.Item
              key={card.id}
              title={card.title}
              subtitle={formatDate(card.created_at)}
              icon={card.image ? { source: card.image } : Icon.Newspaper}
              tooltip={card.source_url}
              actions={<CardActions card={card} />}
            />
          ))}
        </>
      )}
    </List>
  );
}
