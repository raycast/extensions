import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { compareDesc, format } from "date-fns";
import { notesAtom, Note, tagsAtom, Tag, Sort } from "../services/atoms";
import Actions from "./actions";
import { countWords, getTintColor } from "../utils/utils";
import { useCachedState } from "@raycast/utils";
import slugify from "slugify";
import { includes, pull } from "lodash";

const ListItem = ({
  note,
  tags = [],
  filterByTags,
  onApplyTag,
  showMenu = false,
}: {
  note: Note;
  tags?: Tag[];
  filterByTags: (str: string) => void;
  onApplyTag: (tag: string, noteBody?: string) => void;
  showMenu?: boolean;
}) => {
  const generateBody = (note: Note) => {
    if (note.summary) {
      return `
### Summary AI

${note.summary ?? "No summary available."}

---

${note.body}
`;
    } else {
      return note.body;
    }
  };

  return (
    <List.Item
      title={note.title}
      detail={
        <List.Item.Detail
          markdown={generateBody(note)}
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
                <List.Item.Detail.Metadata.Label title="Word Count" text={`${countWords(note.body) ?? 0}`} />
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
          onTagFilter={filterByTags}
          onApplyTag={onApplyTag}
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

const sortNotes = (notes: Note[], sort: Sort) => {
  return [...notes].sort((a, b) => {
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
};

const NotesList = ({ sText, sTag }: { sText?: string; sTag?: string }) => {
  const [notes, setNotes] = useAtom(notesAtom);
  const [tags] = useAtom(tagsAtom);
  const [menu] = useCachedState("menu", false);
  const [sort] = useCachedState<Sort>("sort", "updated");

  const [searchText, setSearchText] = useState(sText ?? "");
  const [searchTag, setSearchTag] = useState(sTag ?? "");
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);

  // Update notes on sort
  useEffect(() => {
    const sortedNotes = sortNotes(notes, sort);
    setFilteredNotes(sortedNotes);
    if (searchTag) {
      filterByTags(searchTag);
    }
  }, [sort, notes, searchTag]);

  const drafts = filteredNotes.filter((n) => n.is_draft);
  const published = filteredNotes.filter((n) => !n.is_draft);

  // Sort by tag if user preference is set
  const isCategories = sort === "tags";
  const noTagNotes = published.filter((n) => n.tags.length === 0);

  // Custom search
  const filterList = (searchText: string) => {
    setSearchText(searchText);
    const normalizedSearchString = searchText.trim().toLowerCase();
    const notesWithTags = searchTag ? notes.filter((obj) => obj.tags.includes(searchTag)) : notes;
    if (!searchText || !normalizedSearchString) {
      setFilteredNotes(sortNotes(notesWithTags, sort));
      return;
    }
    const filtered = sortNotes(notesWithTags, sort).filter((obj) =>
      Object.values(obj).some((value) =>
        typeof value === "string"
          ? value.trim().toLowerCase().includes(normalizedSearchString)
          : Array.isArray(value) && value.some((item) => item.trim().toLowerCase().includes(normalizedSearchString)),
      ),
    );
    setFilteredNotes(filtered);
  };

  const filterByTags = (tag: string) => {
    const sortedNotes = sortNotes(notes, sort);
    if (tag === "") {
      setSearchTag("");
      setFilteredNotes(sortedNotes);
      return;
    }
    setSearchTag(tag);
    const filtered = sortedNotes.filter((obj) => obj.tags.includes(tag));
    setFilteredNotes(filtered);
  };

  const onApplyTag = (tag: string, noteBody: string | undefined) => {
    if (!noteBody) {
      return;
    }
    const note = notes.find((n) => n.body.includes(noteBody));
    if (!note) {
      return;
    }

    const newTags = [...note.tags];

    if (includes(newTags, tag)) {
      pull(newTags, tag);
    } else {
      newTags.push(tag);
    }

    const newNote = { ...note, tags: newTags };
    const updatedNotes = notes.map((n) => (n.createdAt === note.createdAt ? newNote : n));
    setNotes(updatedNotes);
  };

  return (
    <List
      isLoading={filteredNotes.length === 0 && notes.length !== 0 && searchText === "" && searchTag === ""}
      searchBarPlaceholder="Search for a Note"
      filtering={false}
      isShowingDetail={notes.length > 0}
      onSearchTextChange={filterList}
      searchText={searchText}
      searchBarAccessory={
        tags.length > 0 ? (
          <List.Dropdown
            onChange={(value) => filterByTags(value)}
            storeValue={false}
            value={searchTag}
            placeholder="Tags"
            tooltip="Tags"
          >
            <List.Dropdown.Item title="All Notes" value="" />
            {tags.map((tag, index) => (
              <List.Dropdown.Item key={index} title={tag.name} value={tag.name} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {published.length === 0 && drafts.length === 0 ? (
        <List.EmptyView
          title="⌘ + N to create a new note."
          actions={<Actions noNotes onTagFilter={filterByTags} onApplyTag={onApplyTag} />}
        />
      ) : (
        <>
          {drafts.length > 0 && (
            <List.Section title="Drafts">
              {drafts.map((note, index) => (
                <ListItem
                  key={index}
                  note={note}
                  showMenu={menu}
                  filterByTags={filterByTags}
                  onApplyTag={onApplyTag}
                  tags={tags}
                />
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
                        <ListItem
                          key={index}
                          note={note}
                          showMenu={menu}
                          filterByTags={filterByTags}
                          onApplyTag={onApplyTag}
                          tags={tags}
                        />
                      ),
                  )}
                </List.Section>
              ))}
              {noTagNotes.length > 0 && (
                <List.Section title="Notes">
                  {noTagNotes.map((note, index) => (
                    <ListItem
                      key={index}
                      note={note}
                      showMenu={menu}
                      filterByTags={filterByTags}
                      onApplyTag={onApplyTag}
                      tags={tags}
                    />
                  ))}
                </List.Section>
              )}
            </>
          ) : (
            <List.Section title="Notes">
              {published.map((note, index) => (
                <ListItem
                  key={index}
                  note={note}
                  showMenu={menu}
                  filterByTags={filterByTags}
                  tags={tags}
                  onApplyTag={onApplyTag}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
};

export default NotesList;
