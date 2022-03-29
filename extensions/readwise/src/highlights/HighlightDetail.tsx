import { ActionPanel, Action, Detail } from "@raycast/api";
import formatDate from "date-fns/format";

export const HighlightDetail = ({ item }: { item: Highlight }) => {
  const bookUrl = `https://readwise.io/bookreview/${item.book_id}`;
  const highlightUrl = `https://readwise.io/open/${item.id}`;

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Text" content={item.text} shortcut={{ modifiers: ["cmd"], key: "." }} />
          {item.url && <Action.OpenInBrowser title="Open Source" url={item.url} />}
          <Action.OpenInBrowser title="Open Highlight" url={highlightUrl} />
          <Action.OpenInBrowser title="Browse related highlights" url={bookUrl} />
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
                <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {item.url && <Detail.Metadata.Link title="Source" target={item.url} text={item.url} />}
          <Action.OpenInBrowser title="Open Highlight" url={highlightUrl} />
          <Detail.Metadata.Link title="Related" target={bookUrl} text="Browse related highlights" />
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
      markdown={[`## Hightlight\n${item.text}`, item.note && `## Notes\n${item.note}`].filter(Boolean).join("\n\n")}
    />
  );
};
