import { Action, ActionPanel, Detail } from "@raycast/api";
import { DetailMetaDataTags } from "../components/DetailMetadata";

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
          {/* BOOK DETAILS */}
          <Detail.Metadata.Label title="Author" text={item.author} />
          <Detail.Metadata.Label title="Category" text={item.category} />
          <Detail.Metadata.Label title="Source" text={item.source} />

          <Detail.Metadata.Label title="Last Highlighted At" text={getFormatedDateString(item.last_highlight_at)} />
          <Detail.Metadata.Label title="Updated At" text={getFormatedDateString(item.updated)} />
          <DetailMetaDataTags tags={item.tags} />

          {/* LINKS */}
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
