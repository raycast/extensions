import { Action, ActionPanel, Detail, Icon, List, launchCommand, LaunchType } from "@raycast/api";
import path from "node:path";
import { BooxClient } from "../api/boox-client";
import { ConnectionEmptyView } from "../components/connection-state";
import { usePaginatedQuery } from "../hooks/use-paginated-query";
import { downloadStorageEntry } from "../lib/download";
import { formatBytes, formatDate } from "../lib/format";
import { displayRemotePath } from "../lib/paths";
import { LibraryBook, LibraryShelf } from "../models/boox";

type LibraryItem = { type: "shelf"; value: LibraryShelf } | { type: "book"; value: LibraryBook };

export function LibraryView(props: { client: BooxClient; parentId?: string; title?: string }) {
  const query = usePaginatedQuery<LibraryItem>(
    `library:${props.client.host}:${props.parentId ?? "root"}`,
    async (offset, limit) => {
      const page = await props.client.getLibrary({ parentId: props.parentId, offset, limit });
      const items: LibraryItem[] = [
        ...page.shelves.map((value) => ({ type: "shelf" as const, value })),
        ...page.books.map((value) => ({ type: "book" as const, value })),
      ];
      return { items, hasMore: offset + items.length < page.bookCount + page.shelfCount };
    }
  );
  const shelves = query.data.flatMap((item) => (item.type === "shelf" ? [item.value] : []));
  const books = query.data.flatMap((item) => (item.type === "book" ? [item.value] : []));
  return (
    <List
      isLoading={query.isLoading}
      navigationTitle={props.title || "BOOX Library"}
      searchBarPlaceholder="Search books and shelves"
      pagination={query.pagination}
    >
      {query.error ? <ConnectionEmptyView error={query.error} onRetry={query.revalidate} /> : null}
      {!query.isLoading && !query.error && !query.data.length ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Library Is Empty"
          actions={
            <ActionPanel>
              <Action
                title="Add to BOOX Library"
                icon={Icon.Upload}
                onAction={() =>
                  launchCommand({
                    name: "send-to-boox",
                    type: LaunchType.UserInitiated,
                    context: { mode: "library", libraryParentId: props.parentId, libraryParentTitle: props.title },
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : null}
      {shelves.length ? (
        <List.Section title="Shelves" subtitle={String(shelves.length)}>
          {shelves.map((shelf) => (
            <List.Item
              key={shelf.id}
              icon={props.client.thumbnailUrl(shelf.coverPath) || Icon.Folder}
              title={shelf.title}
              accessories={[{ text: `${shelf.childCount} items` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Shelf"
                    icon={Icon.Folder}
                    target={<LibraryView client={props.client} parentId={shelf.id} title={shelf.title} />}
                  />
                  <Action
                    title="Add to This Shelf"
                    icon={Icon.Upload}
                    onAction={() =>
                      launchCommand({
                        name: "send-to-boox",
                        type: LaunchType.UserInitiated,
                        context: { mode: "library", libraryParentId: shelf.id, libraryParentTitle: shelf.title },
                      })
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {books.length ? (
        <List.Section title="Books" subtitle={String(books.length)}>
          {books.map((book) => (
            <BookListItem key={book.id} client={props.client} book={book} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

export function BookListItem(props: { client: BooxClient; book: LibraryBook }) {
  const { book, client } = props;
  const progress = book.progressPercent > 0 ? `${Math.round(book.progressPercent)}%` : undefined;
  return (
    <List.Item
      icon={client.thumbnailUrl(book.coverPath) || Icon.Book}
      title={book.title}
      subtitle={book.authors.join(", ") || book.format}
      accessories={[...(progress ? [{ text: progress }] : []), ...(book.favorite ? [{ icon: Icon.Heart }] : [])]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<BookDetail client={client} book={book} />} />
          {book.path ? (
            <Action
              title="Download"
              icon={Icon.Download}
              onAction={() =>
                downloadStorageEntry(client, {
                  dir: false,
                  name: book.name || path.basename(book.path),
                  path: book.path,
                  size: book.size,
                  updatedAt: book.updatedAt?.getTime() ?? 0,
                })
              }
            />
          ) : null}
          {book.path ? <Action.CopyToClipboard title="Copy BOOX Path" content={displayRemotePath(book.path)} /> : null}
        </ActionPanel>
      }
    />
  );
}

function BookDetail(props: { client: BooxClient; book: LibraryBook }) {
  const { book, client } = props;
  const cover = client.thumbnailUrl(book.coverPath);
  const markdown = `${cover ? `![${book.title}](${cover})\n\n` : ""}# ${book.title}`;
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Format" text={book.format || "Unknown"} />
          <Detail.Metadata.Label
            title="Progress"
            text={`${Math.round(book.progressPercent)}%${book.progress ? ` · ${book.progress}` : ""}`}
          />
          <Detail.Metadata.Label title="Authors" text={book.authors.join(", ") || "Unknown"} />
          <Detail.Metadata.Label title="Size" text={formatBytes(book.size)} />
          <Detail.Metadata.Label title="Last Read" text={formatDate(book.lastAccess)} />
          <Detail.Metadata.Label title="Updated" text={formatDate(book.updatedAt)} />
          <Detail.Metadata.Label title="Path" text={book.path ? displayRemotePath(book.path) : "Unknown"} />
          {book.tags.length ? (
            <Detail.Metadata.TagList title="Tags">
              {book.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        book.path ? (
          <ActionPanel>
            <Action
              title="Download"
              icon={Icon.Download}
              onAction={() =>
                downloadStorageEntry(client, {
                  dir: false,
                  name: book.name || path.basename(book.path),
                  path: book.path,
                  size: book.size,
                  updatedAt: book.updatedAt?.getTime() ?? 0,
                })
              }
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
