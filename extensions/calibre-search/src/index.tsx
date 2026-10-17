import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { basename, join } from "path";
import { useMemo, useState } from "react";
import { ALL_BOOKS_QUERY, mapRow } from "./calibre";
import { filterBooks, preferredFormat } from "./utils";
import type { Book, BookRow } from "./types";

export default function Command(props: { arguments: { searchText?: string } }) {
  const { libraryPath } = getPreferenceValues<Preferences>();
  const dbPath = join(libraryPath, "metadata.db");
  const libraryName = basename(libraryPath).replace(/ /g, "_");
  const [searchText, setSearchText] = useState(
    props.arguments.searchText?.trim() ?? "",
  );

  const { data, isLoading, permissionView } = useSQL<BookRow>(
    dbPath,
    ALL_BOOKS_QUERY,
    {
      permissionPriming: "Required to read your Calibre library database",
    },
  );

  const books = useMemo(
    () => (data ?? []).map((row) => mapRow(row, libraryPath)),
    [data, libraryPath],
  );

  const filtered = useMemo(
    () => filterBooks(books, searchText),
    [books, searchText],
  );

  if (permissionView) return permissionView;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by title or author…"
      throttle
    >
      {filtered.map((book) => (
        <BookItem key={book.id} book={book} libraryName={libraryName} />
      ))}
    </List>
  );
}

function BookItem({ book, libraryName }: { book: Book; libraryName: string }) {
  const formatTags = book.formats.map((f) => ({
    tag: { value: f.format, color: Color.Blue },
  }));

  const yearAccessory = book.year
    ? [{ text: String(book.year), tooltip: "Publication year" }]
    : [];

  const icon = book.coverPath
    ? { source: book.coverPath }
    : { source: Icon.Book };

  return (
    <List.Item
      icon={icon}
      title={book.title}
      subtitle={book.author}
      accessories={[...formatTags, ...yearAccessory]}
      detail={<BookDetail book={book} />}
      actions={<BookActions book={book} libraryName={libraryName} />}
    />
  );
}

function BookDetail({ book }: { book: Book }) {
  const seriesLabel =
    book.series && book.seriesIndex != null
      ? `${book.series} #${book.seriesIndex % 1 === 0 ? Math.trunc(book.seriesIndex) : book.seriesIndex}`
      : (book.series ?? null);

  const synopsis = book.coverPath
    ? `![Cover](${encodeURI(`file://${book.coverPath}`)}?raycast-width=90)`
    : "";

  return (
    <List.Item.Detail
      markdown={synopsis}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Author" text={book.author} />
          <List.Item.Detail.Metadata.Label title="Title" text={book.title} />
          {book.year && (
            <List.Item.Detail.Metadata.Label
              title="Year"
              text={String(book.year)}
            />
          )}
          {book.publisher && (
            <List.Item.Detail.Metadata.Label
              title="Publisher"
              text={book.publisher}
            />
          )}
          {seriesLabel && (
            <List.Item.Detail.Metadata.Label
              title="Series"
              text={seriesLabel}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Formats">
            {book.formats.map((f) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={f.format}
                text={f.format}
                color={Color.Blue}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function BookActions({
  book,
  libraryName,
}: {
  book: Book;
  libraryName: string;
}) {
  const best = preferredFormat(book.formats);
  const filePath = best
    ? join(book.bookFolderPath, `${best.name}.${best.format.toLowerCase()}`)
    : null;

  const calibreUrl = `calibre://show-book/${libraryName}/${book.id}`;

  async function handleOpenInCalibre() {
    try {
      await open(calibreUrl);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Calibre",
      });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Open in Calibre"
          icon={Icon.Book}
          onAction={handleOpenInCalibre}
        />
        {filePath && (
          <Action.Open
            title="Open File Directly"
            target={filePath}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}
      </ActionPanel.Section>
      {book.comments && (
        <ActionPanel.Section>
          <Action.Push
            title="Show Synopsis"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={
              <Detail
                navigationTitle={book.title}
                markdown={`## Synopsis\n\n${book.comments}`}
              />
            }
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Title & Author"
          content={`"${book.title}" by ${book.author}`}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.ShowInFinder
          path={book.bookFolderPath}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
