import { List } from "@raycast/api";
import { useMemo } from "react";
import { RouterOutputs } from "../utils/trpc.util";
import { qrSvgDataUri } from "../utils/qr.util";

type Bookmark = RouterOutputs["bookmark"]["listAll"][number];
type Me = RouterOutputs["user"]["me"];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

// Detail panel on the right side of a bookmark. The QR code is generated synchronously as SVG from the URL
// and embedded in the markdown.
// Note: "updated by" is not currently stored in the DB, so only the time is shown.
export function BookmarkItemDetail({ bookmark, me }: { bookmark: Bookmark; me?: Me }) {
  const qrUri = useMemo(() => qrSvgDataUri(bookmark.url), [bookmark.url]);
  const space = me?.associatedSpaces.find((s) => s.id === bookmark.spaceId);

  // The title is already shown on the left as the List.Item title, so it isn't duplicated in the markdown.
  // Description can be long, so instead of Metadata.Label (single line, truncated with ...)
  // it is placed at the bottom of the markdown (below the QR) so it wraps naturally.
  const markdown = [qrUri ? `![QR Code](${qrUri})` : "", bookmark.description ? `\n${bookmark.description}` : ""]
    .filter(Boolean)
    .join("\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="URL" target={bookmark.url} text={bookmark.url} />
          <List.Item.Detail.Metadata.Label title="Space" text={space?.name ?? bookmark.spaceName} />
          {bookmark.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {bookmark.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={`${formatDate(bookmark.createdAt)} · ${bookmark.authorName ?? bookmark.authorEmail}`}
          />
          <List.Item.Detail.Metadata.Label title="Updated" text={formatDate(bookmark.updatedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
