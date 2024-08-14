import { Action, ActionPanel, Color, getPreferenceValues, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
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
  const [db, error] = useBearDb();
  const [notes, setNotes] = useState<Note[]>();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (db != null) {
      setNotes(db.getNotes(searchQuery, selectedTag ?? undefined));
    }
  }, [db, searchQuery, selectedTag]);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  const showDetail = (notes ?? []).length > 0 && getPreferenceValues<Preferences>().showPreviewInListView;
  const handleTagChange = (tag: string | null) => setSelectedTag(tag);

  return (
    <List
      isLoading={notes == undefined}
      onSearchTextChange={setSearchQuery}
      searchText={searchQuery}
      searchBarPlaceholder="Search note text or id ..."
      isShowingDetail={showDetail}
      throttle={true}
      searchBarAccessory={<TagsDropdown onTagChange={handleTagChange} />}
    >
      {notes?.map((note) => (
        <List.Item
          key={note.id}
          title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
          subtitle={showDetail ? undefined : note.formattedTags}
          icon={{ source: "command-icon.png" }}
          keywords={[note.id]}
          actions={<NoteActions isNotePreview={false} note={note} />}
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
            <List.Item.Detail
              markdown={note.encrypted ? "*This note's content is encrypted*" : note.text}
              metadata={<NoteMetadata note={note} />}
            />
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
