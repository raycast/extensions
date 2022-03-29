import { ActionPanel, Action, Detail } from "@raycast/api";
import formatDate from "date-fns/format";

import { useBook } from "../books/useBook";

export const HighlightDetail = ({ item }: { item: Highlight }) => {
  const { data, loading } = useBook(item.book_id);

  const bookUrl = data?.highlights_url;
  const highlightUrl = `https://readwise.io/open/${item.id}`;

  return (
    <Detail
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Text" content={item.text} shortcut={{ modifiers: ["cmd"], key: "." }} />
          {item.url && <Action.OpenInBrowser title="Open Source" url={item.url} />}
          <Action.OpenInBrowser title="Open Highlight" url={highlightUrl} />
          {bookUrl && <Action.OpenInBrowser title="Browse related highlights" url={bookUrl} />}
        </ActionPanel>
      }
      navigationTitle={"Highlight Detail"}
      metadata={
        <Detail.Metadata>
          {/* BOOK DETAILS */}
          <Detail.Metadata.Label title="Author" text={data?.author || "-"} />
          <Detail.Metadata.Label title="Category" text={data?.category || "-"} />
          <Detail.Metadata.Label title="Source" text={data?.source || "-"} />

          <Detail.Metadata.Separator />

          {/* HIGHLIGHT DETAILS */}
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

          <Detail.Metadata.Separator />

          {/* LINKS */}
          {item.url && <Detail.Metadata.Link title="Source" target={item.url} text={item.url} />}
          <Action.OpenInBrowser title="Open Highlight" url={highlightUrl} />
          {bookUrl && <Detail.Metadata.Link title="Related" text="Browse related highlights" target={bookUrl} />}
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
      markdown={[`## Hightlight\n${item.text}`, item.note && `## Notes\n${item.note}`].filter(Boolean).join("\n\n")}
    />
  );
};
