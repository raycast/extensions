import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { format } from "date-fns";
import { notesAtom, Note, tagsAtom } from "../services/atoms";
import Actions from "./actions";
import { preferences } from "../services/config";

const ListItem = ({ note, filterList }: { note: Note; filterList: (str: string) => void }) => {
  return (
    <List.Item
      title={note.title}
      detail={<List.Item.Detail markdown={note.body} />}
      actions={
        <Actions
          noNotes={false}
          isDraft={note.is_draft}
          title={note.title}
          note={note.body}
          tags={note.tags}
          createdAt={note.createdAt}
          onTagFilter={filterList}
        />
      }
      accessories={[
        {
          date: new Date(note.updatedAt),
          tooltip: `Last updated ${format(note.updatedAt, "MMMM d, yyyy '@' HH:mm")}`,
        },
      ]}
    />
  );
};

const NotesList = () => {
  const [notes] = useAtom(notesAtom);
  const [tags] = useAtom(tagsAtom);

  const [searchText, setSearchText] = useState("");
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes);

  useEffect(() => {
    setFilteredNotes(notes);
  }, [notes]);

  const drafts = filteredNotes.filter((n) => n.is_draft);
  const published = filteredNotes.filter((n) => !n.is_draft);

  // Sort by tag if user preference is set
  const isCategories = preferences.sort === "tags";
  const noTagNotes = published.filter((n) => n.tags.length === 0);

  // Custom search
  const filterList = (searchText: string) => {
    setSearchText(searchText);
    const normalizedSearchString = searchText.trim().toLowerCase();
    const filtered = notes.filter((obj) =>
      Object.values(obj).some((value) =>
        typeof value === "string"
          ? value.trim().toLowerCase().includes(normalizedSearchString)
          : Array.isArray(value) && value.some((item) => item.trim().toLowerCase().includes(normalizedSearchString)),
      ),
    );
    setFilteredNotes(filtered);
  };

  return (
    <List
      searchBarPlaceholder="Search for a Note"
      filtering={false}
      isShowingDetail={notes.length > 0}
      onSearchTextChange={filterList}
      searchText={searchText}
    >
      {published.length === 0 && drafts.length === 0 ? (
        <List.EmptyView title="⌘ + N to create a new note." actions={<Actions noNotes onTagFilter={filterList} />} />
      ) : (
        <>
          {drafts.length > 0 && (
            <List.Section title="Drafts">
              {drafts.map((note, index) => (
                <ListItem key={index} note={note} filterList={filterList} />
              ))}
            </List.Section>
          )}
          {isCategories ? (
            <>
              {tags.map((tag, index) => (
                <List.Section key={index} title={tag.name}>
                  {published.map(
                    (note, index) =>
                      note.tags.includes(tag.name) && <ListItem key={index} note={note} filterList={filterList} />,
                  )}
                </List.Section>
              ))}
              {noTagNotes.length > 0 && (
                <List.Section title="Notes">
                  {noTagNotes.map((note, index) => (
                    <ListItem key={index} note={note} filterList={filterList} />
                  ))}
                </List.Section>
              )}
            </>
          ) : (
            <List.Section title="Notes">
              {published.map((note, index) => (
                <ListItem key={index} note={note} filterList={filterList} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
};

export default NotesList;
