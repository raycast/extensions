import { Action, ActionPanel, Detail } from "@raycast/api";
import formatDate from "date-fns/format";
import { Book } from "./types";

export const BookDetail = ({ item }: { item: Book }) => {
  return (
    <Detail
      actions={
        <ActionPanel>
          {item.source_url && <Action.OpenInBrowser title="Open Source" url={item.source_url} />}
          <Action.OpenInBrowser title="Browse Highlights" url={item.highlights_url} />
        </ActionPanel>
      }
      navigationTitle={"Highlight"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={item.author} />
          <Detail.Metadata.Label
            title="Last Highlighted At"
            text={formatDate(new Date(item.last_highlight_at), "MMMM dd, yyyy hh:mm")}
          />
          <Detail.Metadata.Label title="Updated At" text={formatDate(new Date(item.updated), "MMMM dd, yyyy hh:mm")} />
          {item.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tag">
              {item.tags.map((tag) => (
                <Detail.Metadata.TagList.Item text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Link title="Highlights" target={item.highlights_url} text="Link" />
          <Detail.Metadata.Label title="Source" text={item.source} />
          {item.source_url && <Detail.Metadata.Link title="Source URL" target={item.source_url} text="Link" />}
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
      markdown={`
## ${item.title} - ${item.author}

![cover image](${item.cover_image_url})
`}
    />
  );
};
