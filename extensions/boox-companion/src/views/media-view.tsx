import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { BooxClient } from "../api/boox-client";
import { ConnectionEmptyView } from "../components/connection-state";
import { usePaginatedQuery } from "../hooks/use-paginated-query";
import { downloadStorageEntry } from "../lib/download";
import { formatBytes, formatDate } from "../lib/format";
import { displayRemotePath } from "../lib/paths";

export function MediaView(props: { client: BooxClient; type: string; title: string }) {
  const query = usePaginatedQuery(`media:${props.client.host}:${props.type}`, async (offset, limit) => {
    const page = await props.client.getMediaList(props.type, offset, limit);
    return { items: page.list, hasMore: offset + page.list.length < page.count };
  });
  return (
    <List
      isLoading={query.isLoading}
      navigationTitle={props.title}
      searchBarPlaceholder={`Search ${props.title.toLowerCase()}`}
      pagination={query.pagination}
    >
      {query.error ? <ConnectionEmptyView error={query.error} onRetry={query.revalidate} /> : null}
      {!query.isLoading && !query.error && !query.data.length ? (
        <List.EmptyView icon={mediaIcon(props.type)} title={`No ${props.title}`} />
      ) : null}
      {query.data.map((entry) => (
        <List.Item
          key={entry.path}
          icon={props.client.thumbnailUrl(entry.thumbnail) || mediaIcon(props.type)}
          title={entry.name}
          subtitle={formatBytes(entry.size)}
          accessories={[{ text: formatDate(entry.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action
                title="Download"
                icon={Icon.Download}
                onAction={() => downloadStorageEntry(props.client, entry)}
              />
              <Action.CopyToClipboard title="Copy BOOX Path" content={displayRemotePath(entry.path)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function mediaIcon(type: string): Icon {
  switch (type.toLowerCase()) {
    case "image":
      return Icon.Image;
    case "video":
      return Icon.FilmStrip;
    case "music":
      return Icon.Music;
    case "download":
      return Icon.Download;
    default:
      return Icon.Document;
  }
}
