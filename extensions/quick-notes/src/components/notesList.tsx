import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { compareDesc, format } from "date-fns";
import { notesAtom, Note, tagsAtom, Tag, Sort } from "../services/atoms";
import Actions from "./actions";
import { getTintColor } from "../utils/utils";
import { useCachedState } from "@raycast/utils";
import slugify from "slugify";

const ListItem = ({
  note,
  tags = [],
  filterList,
  showMenu = false,
}: {
  note: Note;
  tags?: Tag[];
  filterList: (str: string) => void;
  showMenu?: boolean;
}) => {
  return (
    <List.Item
      title={note.title}
      detail={
        <List.Item.Detail
          markdown={note.body}
          metadata={
            showMenu ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title={note.title} />
                {note.tags.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {note.tags.map((tag, index) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={index}
                        text={tag}
                        color={getTintColor(tags.find((t) => t.name === tag)?.color)}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}
                <List.Item.Detail.Metadata.Label
                  title="Word Count"
                  text={`${
                    note.body.split(" ").filter((n) => {
                      return n != "";
                    }).length ?? 0
                  }`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Created At"
                  text={format(note.createdAt, "MMMM d, yyyy '@' HH:mm")}
                />
                <List.Item.Detail.Metadata.Label
                  title="Updated At"
                  text={format(note.updatedAt, "MMMM d, yyyy '@' HH:mm")}
                />
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      }
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
  const [menu] = useCachedState("menu", false);
  const [sort] = useCachedState<Sort>("sort", "updated");

  const [searchText, setSearchText] = useState("");
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes);

  // Update notes on sort
  useEffect(() => {
    const sortedNotes = [...notes].sort((a, b) => {
      if (sort === "created") {
        return compareDesc(new Date(a.createdAt), new Date(b.createdAt));
      } else if (sort === "alphabetical") {
        return slugify(a.title).localeCompare(slugify(b.title));
      } else if (sort === "updated") {
        return compareDesc(new Date(a.updatedAt), new Date(b.updatedAt));
      } else {
        return 0;
      }
    });
    setFilteredNotes(sortedNotes);
  }, [sort, notes]);

  const drafts = filteredNotes.filter((n) => n.is_draft);
  const published = filteredNotes.filter((n) => !n.is_draft);

  // Sort by tag if user preference is set
  const isCategories = sort === "tags";
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
                <ListItem key={index} note={note} showMenu={menu} filterList={filterList} tags={tags} />
              ))}
            </List.Section>
          )}
          {isCategories ? (
            <>
              {tags.map((tag, index) => (
                <List.Section key={index} title={tag.name}>
                  {published.map(
                    (note, index) =>
                      note.tags.includes(tag.name) && (
                        <ListItem key={index} note={note} showMenu={menu} filterList={filterList} tags={tags} />
                      ),
                  )}
                </List.Section>
              ))}
              {noTagNotes.length > 0 && (
                <List.Section title="Notes">
                  {noTagNotes.map((note, index) => (
                    <ListItem key={index} note={note} showMenu={menu} filterList={filterList} tags={tags} />
                  ))}
                </List.Section>
              )}
            </>
          ) : (
            <List.Section title="Notes">
              {published.map((note, index) => (
                <ListItem key={index} note={note} showMenu={menu} filterList={filterList} tags={tags} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
};

export default NotesList;
