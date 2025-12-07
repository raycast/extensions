import { List } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotesContext, useNotesDispatchContext } from "../../utils/hooks";
import { SearchArguments } from "../../utils/interfaces";
import { NoteReducerActionType } from "../../utils/reducers";

export function NoteListDropdown(props: {
  tags: string[];
  searchArguments: SearchArguments;
}) {
  const allNotes = useNotesContext();
  const dispatch = useNotesDispatchContext();
  const { tags, searchArguments } = props;
  const prevNotesRef = useRef(allNotes);

  const [selectedTag, setSelectedTag] = useState<string>(() => {
    if (searchArguments.tagArgument) {
      if (searchArguments.tagArgument.startsWith("#")) {
        return searchArguments.tagArgument;
      } else {
        return "#" + searchArguments.tagArgument;
      }
    }
    return "all";
  });

  // Only re-filter when tag changes (not when allNotes changes from filtering)
  useEffect(() => {
    // Skip if allNotes reference is the same (no actual change)
    if (allNotes === prevNotesRef.current && selectedTag === "all") {
      return;
    }
    prevNotesRef.current = allNotes;

    if (allNotes) {
      if (selectedTag !== "all") {
        dispatch({
          type: NoteReducerActionType.Set,
          payload: allNotes.filter((note) => note.tags.includes(selectedTag)),
        });
      } else {
        dispatch({ type: NoteReducerActionType.Set, payload: allNotes });
      }
    }
  }, [selectedTag, allNotes, dispatch]);

  const handleChange = useCallback((tag: string) => {
    setSelectedTag(tag);
  }, []);

  return (
    <List.Dropdown
      tooltip="Filter notes by tag"
      value={selectedTag}
      onChange={handleChange}
    >
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Section title="Tags" />
      {tags.map((tag: string) => (
        <List.Dropdown.Item title={tag} value={tag} key={tag} />
      ))}
    </List.Dropdown>
  );
}
