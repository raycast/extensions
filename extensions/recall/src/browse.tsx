import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { listCards, getCardContent, Card, RecallError } from "./api";
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

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function previewDescription(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 200 ? flat.slice(0, 200) + "…" : flat;
}

/** Right-hand pane of a selected card, matching the bookmark-card layout. */
function CardDetailPane(props: { card: Card; description?: string; isLoadingDescription?: boolean }) {
  const { card, description, isLoadingDescription } = props;
  const descriptionText = description ?? (isLoadingDescription ? "Loading…" : undefined);
  return (
    <List.Item.Detail
      markdown={card.image ? `![Preview](${card.image})` : ""}
      metadata={
        <List.Item.Detail.Metadata>
          {card.source_url && (
            <List.Item.Detail.Metadata.Link
              title="URL"
              target={card.source_url}
              text={domainOf(card.source_url) ?? card.source_url}
            />
          )}
          {descriptionText && <List.Item.Detail.Metadata.Label title="Description" text={descriptionText} />}
          <List.Item.Detail.Metadata.Label title="Created At" text={formatDate(card.created_at)} />
          {card.tags?.length ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {card.tags.map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t.tag_id} text={t.name} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function fetchCardContent(cardId?: string): Promise<string | undefined> {
  return cardId ? getCardContent(cardId) : Promise.resolve(undefined);
}

export default function Command() {
  const [datePreset, setDatePreset] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const titleFilter = useDebounced(searchText.trim().toLowerCase());
  const selectedId_ = useDebounced(selectedId);

  const { data: cards, isLoading, error } = usePromise(listCards, [dateRange(datePreset)]);

  const visible = cards?.filter((c) => !titleFilter || c.title.toLowerCase().includes(titleFilter));
  const selected = visible?.find((c) => c.id === selectedId_) ?? visible?.[0];

  const { data: content, isLoading: isLoadingContent } = usePromise(fetchCardContent, [selected?.id]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id ?? "")}
      searchBarPlaceholder="Search bookmarks…"
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
              title={titleFilter ? "No cards match this search" : "No cards yet"}
              description={titleFilter ? undefined : "Save content in Recall, then it appears here"}
            />
          )}
          {visible?.map((card) => (
            <List.Item
              id={card.id}
              key={card.id}
              title={card.title}
              subtitle={formatDate(card.created_at)}
              icon={card.image ? { source: card.image } : Icon.Bookmark}
              detail={
                selected?.id === card.id ? (
                  <CardDetailPane
                    card={card}
                    description={content && previewDescription(content)}
                    isLoadingDescription={isLoadingContent}
                  />
                ) : undefined
              }
              actions={<CardActions card={card} />}
            />
          ))}
        </>
      )}
    </List>
  );
}
