import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { format } from "date-fns";
import { notesAtom, Note } from "../services/atoms";
import Actions from "./actions";

const NotesList = () => {
  const [notes] = useAtom(notesAtom);

  const [searchText, setSearchText] = useState("");
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes);

  useEffect(() => {
    setFilteredNotes(notes);
  }, [notes]);

  const drafts = filteredNotes.filter((n) => n.is_draft);
  const published = filteredNotes.filter((n) => !n.is_draft);

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
                <List.Item
                  key={index}
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
              ))}
            </List.Section>
          )}
          <List.Section title="Notes">
            {published.map((note, index) => (
              <List.Item
                key={index}
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
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
};

export default NotesList;
