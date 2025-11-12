import { Color, Icon, List } from "@raycast/api";
import type { ContentfulEntry } from "../types/contentful";
import { formatRelativeTime } from "../utils/entry-helpers";
import {
  formatContentType,
  formatSubtitle,
  getContentTypeColor,
} from "../utils/format";
import { EntryActions } from "./entry-actions";

type EntryListItemProps = {
  entry: ContentfulEntry;
};

/**
 * List item component for displaying a Contentful entry
 * Shows title, subtitle (space + content type), content type badge, and last modified date
 */
export function EntryListItem({ entry }: EntryListItemProps) {
  return (
    <List.Item
      accessories={[
        {
          icon: {
            source: Icon.Tag,
            tintColor: getContentTypeColor(entry.contentTypeId),
          },
          tooltip: `Content Type: ${formatContentType(entry.contentType)}`,
        },
        {
          text: formatRelativeTime(entry.updatedAt),
          icon: Icon.Clock,
          tooltip: `Last updated: ${new Date(entry.updatedAt).toLocaleString()}`,
        },
      ]}
      actions={<EntryActions entry={entry} />}
      icon={{ source: Icon.Document, tintColor: Color.Blue }}
      id={`${entry.spaceId}-${entry.id}`}
      subtitle={formatSubtitle(entry.spaceName, entry.contentType)}
      title={entry.title}
    />
  );
}
