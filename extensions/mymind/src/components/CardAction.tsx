import { ActionPanel, Detail, Action, Icon } from "@raycast/api";
import { CardWithSlug, proseToMarkdown } from "../utils";

export function CardActions({ card }: { card: CardWithSlug }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Show Details"
          icon={Icon.Sidebar}
          target={
            <Detail
              markdown={`# ${card.title || "Untitled"}
                
  ${card.description || ""}
  
  ${card.prose?.content ? proseToMarkdown(card.prose.content) : ""}
  
  ${
    card.note?.prose?.content
      ? `
  ---
  ### Notes
  ${proseToMarkdown(card.note.prose.content)}`
      : ""
  }
  
  ---
  `}
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="Created" text={new Date(card.created).toLocaleDateString()} />
                  <Detail.Metadata.Label title="Modified" text={new Date(card.modified).toLocaleDateString()} />
                  {card.source?.url && card.domain && (
                    <Detail.Metadata.Link title="Source" target={card.source.url} text={card.domain} />
                  )}
                  {card.tags && card.tags.length > 0 && (
                    <Detail.Metadata.TagList title="Tags">
                      {card.tags.map((tag) => (
                        <Detail.Metadata.TagList.Item key={tag.content} text={tag.content} color={"#eed535"} />
                      ))}
                    </Detail.Metadata.TagList>
                  )}
                </Detail.Metadata>
              }
              actions={<CardActions card={card} />}
            />
          }
        />
        {card.source?.url && <Action.OpenInBrowser url={card.source.url} />}
        {card.slug && (
          <Action.OpenInBrowser title="Open mymind" url={`https://access.mymind.com/everything/#${card.slug}`} />
        )}
        {card.source?.url && <Action.CopyToClipboard title="Copy Source URL" content={card.source.url} />}
        {card.slug && (
          <Action.CopyToClipboard
            title="Copy mymind URL"
            content={`https://access.mymind.com/everything/#${card.slug}`}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
