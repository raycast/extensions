import { Action, ActionPanel, Color, getPreferenceValues, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteActions, { createBasicNote } from "./note-actions";
import TagsDropdown from "./search-dropdown";

interface SearchNotesArguments {
  searchQuery?: string;
}
export default function SearchNotes(props: LaunchProps<{ arguments: SearchNotesArguments }>) {
  const { searchQuery: initialSearchQuery } = props.arguments;
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? "");
  const [selectedId, setSelectedId] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [db, error] = useBearDb();
  const [notes, setNotes] = useState<Note[]>();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (db != null) {
      setIsSearching(true);
      const timer = setTimeout(
        () => {
          try {
            const results = db.getNotes(searchQuery, selectedTag ?? undefined);
            setNotes(results);
            setSelectedId((previous) => (results.some((note) => note.id === previous) ? previous : results[0]?.id));
          } catch (error) {
            showToast(Toast.Style.Failure, "Search failed", String(error));
          } finally {
            setIsSearching(false);
          }
        },
        searchQuery ? 150 : 0,
      );
      return () => clearTimeout(timer);
    }
  }, [db, searchQuery, selectedTag]);

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }, [error]);

  const selectedNote = notes?.find((note) => note.id === selectedId);
  const preview = useMemo(
    () => (selectedNote?.encrypted ? "*This note's content is encrypted*" : selectedNote?.text ?? ""),
    [selectedNote],
  );

  const showDetail = (notes ?? []).length > 0 && getPreferenceValues<Preferences>().showPreviewInListView;
  const handleTagChange = (tag: string | null) => setSelectedTag(tag);

  return (
    <List
      isLoading={!error && (notes == undefined || isSearching)}
      filtering={false}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      onSearchTextChange={setSearchQuery}
      searchText={searchQuery}
      searchBarPlaceholder="Search note text or id ..."
      isShowingDetail={showDetail}
      throttle={false}
      searchBarAccessory={<TagsDropdown db={db} onTagChange={handleTagChange} />}
    >
      {notes?.map((note) => (
        <List.Item
          key={note.id}
          id={note.id}
          title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
          subtitle={showDetail ? undefined : note.formattedTags}
          icon={{ source: "command-icon.png" }}
          keywords={[note.id]}
          actions={note.id === selectedId ? <NoteActions isNotePreview={false} note={note} /> : undefined}
          accessories={
            showDetail
              ? undefined
              : [
                  {
                    date: note.modifiedAt,
                    tooltip: `Last modified ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`,
                  },
                ]
          }
          detail={
            showDetail && note.id === selectedId ? (
              <List.Item.Detail markdown={preview} metadata={<NoteMetadata note={note} />} />
            ) : undefined
          }
        />
      ))}
      {notes?.length === 0 && (
        <List.Item
          title={searchQuery}
          icon={{ source: "command-icon.png" }}
          actions={
            <ActionPanel>
              <Action
                title="Create New Note"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => createBasicNote(searchQuery)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function NoteMetadata({ note }: { note: Note }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Tags">
        {note.tags.length === 0 ? (
          <List.Item.Detail.Metadata.TagList.Item text="Untagged" />
        ) : (
          note.tags.map((tag) => <List.Item.Detail.Metadata.TagList.Item text={tag} key={tag} color={Color.Yellow} />)
        )}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label
        title="Last modified"
        text={formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}
      />
      <List.Item.Detail.Metadata.Label
        title="Created"
        text={formatDistanceToNowStrict(note.createdAt, { addSuffix: true })}
      />
      <List.Item.Detail.Metadata.Label title="Word count" text={`${note.wordCount} words`} />
    </List.Item.Detail.Metadata>
  );
}
