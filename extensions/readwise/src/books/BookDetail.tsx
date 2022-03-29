import { Action, ActionPanel, Detail } from "@raycast/api";
import formatDate from "date-fns/format";

import { getFormatedDateString } from "../utils";
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
      navigationTitle={"Source Detail"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={item.author} />
          <Detail.Metadata.Label title="Category" text={item.category} />
          <Detail.Metadata.Label title="Source" text={item.source} />

          <Detail.Metadata.Label title="Last Highlighted At" text={getFormatedDateString(item.last_highlight_at)} />
          <Detail.Metadata.Label title="Updated At" text={getFormatedDateString(item.updated)} />
          {item.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tag">
              {item.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
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
