import { List, Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { getCard, CardDetail, Chunk, RecallError } from "./api";
import { formatDate, useDebounced, firstLine } from "./utils";

function renderMarkdown(card: CardDetail): string {
  const header = [`# ${card.title}`];
  if (card.source_url) header.push(`**Source:** ${card.source_url}`);
  header.push(`*Saved ${formatDate(card.created_at)}*`);
  const body = card.chunks.map((c) => {
    const meta: string[] = [];
    if (c.source) meta.push(c.source);
    if (c.timestamps?.length) meta.push(c.timestamps.join(", "));
    return [c.content, meta.length ? `*${meta.join(" · ")}*` : ""].filter(Boolean).join("\n\n");
  });
  return [...header, ...body].join("\n\n---\n\n");
}

export function CardDetailPage({ cardId }: { cardId: string }) {
  const { data: card, isLoading, error } = usePromise(getCard, [cardId]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `**Could not load card.** ${error instanceof RecallError ? error.message : String(error)}`
          : card
            ? renderMarkdown(card)
            : ""
      }
      navigationTitle={card?.title}
      metadata={
        card && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Saved" text={formatDate(card.created_at)} />
            {card.source_url && <Detail.Metadata.Link title="Source" target={card.source_url} text="Open in browser" />}
          </Detail.Metadata>
        )
      }
      actions={
        card && (
          <ActionPanel>
            <Action.Push
              title="Ask This Card"
              icon={Icon.Message}
              target={<ChunkSearchPage cardId={card.card_id} cardTitle={card.title} />}
            />
            {card.source_url && (
              <>
                <Action.OpenInBrowser title="Open Source URL" url={card.source_url} />
                <Action.CopyToClipboard title="Copy Source URL" content={card.source_url} />
              </>
            )}
            <Action.CopyToClipboard
              title="Copy Card Content"
              content={card.chunks.map((c) => c.content).join("\n\n")}
            />
          </ActionPanel>
        )
      }
    />
  );
}

export function ChunkSearchPage({ cardId, cardTitle }: { cardId: string; cardTitle: string }) {
  const [query, setQuery] = useState("");
  const focusQuery = useDebounced(query.trim());
  const { data: card, isLoading } = usePromise(
    (cardId: string, focusQuery: string) =>
      focusQuery.length >= 2 ? getCard(cardId, focusQuery) : Promise.resolve(undefined),
    [cardId, focusQuery],
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Ask "${cardTitle}" a question…`}
      navigationTitle={cardTitle}
    >
      {!card ? (
        <List.EmptyView title="Type a question" description="Get the chunks most relevant to it" />
      ) : (
        card.chunks.map((c: Chunk) => (
          <List.Item
            key={c.chunk_id}
            title={firstLine(c.content)}
            subtitle={[c.source, c.timestamps?.join(", ")].filter(Boolean).join(" · ") || undefined}
            detail={<List.Item.Detail markdown={c.content} />}
          />
        ))
      )}
    </List>
  );
}
