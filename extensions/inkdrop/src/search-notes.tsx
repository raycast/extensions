import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { BookMetadata } from "./components/BookMetadata";
import { NoteActions } from "./components/NoteActions";
import { TagMetadata } from "./components/TagMetadata";
import { DEFAULT_SORT, SORT_OPTIONS, useInkdrop, type InkdropOption } from "./inkdrop";
import { truncateBody } from "./utils";

const MAX_PREVIEW_CHARS = 5000;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const buildTimeString = (time: number) => {
  const date = new Date(time);
  const diffDays = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return `${relativeFormatter.format(diffDays, "day")} / ${dateFormatter.format(date)}`;
};

const Command = () => {
  const [keyword, setKeyword] = useState("");
  const [sortValue, setSortValue] = useState(DEFAULT_SORT.value);
  const sortOption = SORT_OPTIONS.find((o) => o.value === sortValue) ?? DEFAULT_SORT;
  const { useNotes, useBooks, useTags, deleteNote, resolveImages } = useInkdrop(getPreferenceValues<InkdropOption>());
  const { notes, isLoading, error, revalidate } = useNotes(keyword, sortOption);
  const { books } = useBooks();
  const { tags } = useTags();

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      await showToast({ style: Toast.Style.Success, title: "Note deleted" });
      revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to delete note" });
    }
  };

  const [previews, setPreviews] = useState(new Map<string, string>());

  useEffect(() => {
    if (!notes) {
      setPreviews(new Map());
      return;
    }
    const initial = new Map(notes.map((n) => [n._id, truncateBody(n.body, MAX_PREVIEW_CHARS)] as const));
    setPreviews(initial);

    let cancelled = false;
    Promise.all(
      notes.map(async (note) => {
        const body = truncateBody(note.body, MAX_PREVIEW_CHARS);
        const resolved = await resolveImages(body);
        return [note._id, resolved] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setPreviews(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [notes]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setKeyword}
      throttle
      searchBarPlaceholder="Search notes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Notes" value={sortValue} onChange={setSortValue}>
          <List.Dropdown.Section title="Sort Notes">
            {SORT_OPTIONS.map((option) => (
              <List.Dropdown.Item key={option.value} value={option.value} title={option.label} icon={option.icon} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {notes?.map((note) => {
        const createdAt = buildTimeString(note.createdAt);
        const updatedAt = buildTimeString(note.updatedAt);
        const preview = previews.get(note._id) ?? "";
        const isTruncated = note.body.length > MAX_PREVIEW_CHARS;

        return (
          <List.Item
            key={note._id}
            title={note.title}
            icon={Icon.Document}
            accessories={[
              ...(isTruncated ? [{ icon: Icon.Info, tooltip: "Preview truncated" }] : []),
              { date: new Date(note.updatedAt), tooltip: "Updated" },
            ]}
            detail={
              <List.Item.Detail
                markdown={preview}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Created" text={createdAt} />
                    <List.Item.Detail.Metadata.Label title="Updated" text={updatedAt} />
                    <List.Item.Detail.Metadata.Separator />
                    <BookMetadata note={note} books={books} />
                    <TagMetadata note={note} tags={tags} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <NoteActions
                  note={note}
                  books={books}
                  tags={tags}
                  resolveImages={resolveImages}
                  onDelete={handleDelete}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {error ? (
        <List.EmptyView
          title="Failed to load notes"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title="No notes found" />
      )}
    </List>
  );
};

export default Command;
