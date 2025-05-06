import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useNotesContext, useNotesDispatchContext } from "../../utils/hooks";
import { SearchArguments } from "../../utils/interfaces";
import { NoteReducerActionType } from "../../utils/reducers";

export function NoteListDropdown(props: { tags: string[]; searchArguments: SearchArguments }) {
  const allNotes = useNotesContext();
  const dispatch = useNotesDispatchContext();
  const { tags, searchArguments } = props;

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

  // Apply the filter whenever selectedTag changes or allNotes changes
  useEffect(() => {
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

  function handleChange(tag: string) {
    setSelectedTag(tag);
  }

  return (
    <List.Dropdown tooltip="Search For" value={selectedTag} onChange={handleChange}>
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Section title="Tags" />
      {tags.map((tag: string) => (
        <List.Dropdown.Item title={tag} value={tag} key={tag} />
      ))}
    </List.Dropdown>
  );
}
