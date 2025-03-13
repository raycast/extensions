import { ActionPanel, Detail, Action, Icon, showToast, Toast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { proseToMarkdown, deleteMyMindCard } from "../utils";
import AddNote from "../add-a-new-note";
import { CardWithSlug } from "../schemas";

export function CardActions({
  card,
  isDetailView = false,
  onDelete,
}: {
  card: CardWithSlug;
  isDetailView?: boolean;
  onDelete?: () => void;
}) {
  const handleDelete = async () => {
    if (!card.slug) return;

    const proceed = await confirmAlert({
      title: "Delete Card",
      message: "Are you sure you want to delete this card? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!proceed) return;

    try {
      await deleteMyMindCard(card.slug);
      await showToast({
        style: Toast.Style.Success,
        title: "Card deleted successfully",
      });

      onDelete?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete card",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!isDetailView && (
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

---`}
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
                          <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} color={"#eed535"} />
                        ))}
                      </Detail.Metadata.TagList>
                    )}
                  </Detail.Metadata>
                }
                actions={<CardActions card={card} isDetailView={true} />}
              />
            }
          />
        )}
        {card.source?.url && <Action.OpenInBrowser url={card.source.url} />}
        {card.slug && (
          <Action.OpenInBrowser title="Open in Mymind" url={`https://access.mymind.com/everything/#${card.slug}`} />
        )}
        {card.source?.url && <Action.CopyToClipboard title="Copy Source URL" content={card.source.url} />}
        {card.slug && (
          <Action.CopyToClipboard
            title="Copy the Mymind URL"
            content={`https://access.mymind.com/everything/#${card.slug}`}
          />
        )}
        {card.slug && (
          <Action
            title="Delete Card"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDelete}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Add New Note"
          target={<AddNote />}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
