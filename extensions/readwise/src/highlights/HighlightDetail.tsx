import { ActionPanel, Action, Detail } from "@raycast/api";
import formatDate from "date-fns/format";

export const HighlightDetail = ({ item }: { item: Highlight }) => {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Text" content={item.text} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
      navigationTitle={"Highlight"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Highlighted At"
            text={formatDate(new Date(item.highlighted_at), "MMMM dd, yyyy hh:mm")}
          />
          <Detail.Metadata.Label title="Updated At" text={formatDate(new Date(item.updated), "MMMM dd, yyyy hh:mm")} />
          {item.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tag">
              {item.tags.map((tag) => (
                <Detail.Metadata.TagList.Item text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {item.url && <Detail.Metadata.Link title="Link" target={item.url} text={item.url} />}
          <Detail.Metadata.Link
            title="Source"
            target={`https://readwise.io/bookreview/${item.book_id}`}
            text="Browse highlights"
          />
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
      markdown={`
## Hightlight
${item.text}
      
## Notes
${item.note}
      `}
    />
  );
};
