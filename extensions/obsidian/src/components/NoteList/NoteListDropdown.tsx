import { SearchArguments } from "../../utils/interfaces";
import { List } from "@raycast/api";
import React from "react";

import { NoteReducerActionType } from "../../utils/data/reducers";
import { useNotesContext, useNotesDispatchContext } from "../../utils/hooks";

export function NoteListDropdown(props: { tags: string[]; searchArguments: SearchArguments }) {
  const allNotes = useNotesContext();
  const dispatch = useNotesDispatchContext();

  const { tags, searchArguments } = props;

  function defaultTagValue() {
    if (searchArguments.tagArgument) {
      if (searchArguments.tagArgument.startsWith("#")) {
        return searchArguments.tagArgument;
      } else {
        return "#" + searchArguments.tagArgument;
      }
    }
  }

  function handleChange(value: string) {
    if (allNotes) {
      if (value != "all") {
        dispatch({ type: NoteReducerActionType.Set, payload: allNotes.filter((note) => note.tags.includes(value)) });
      }
    }
  }

  function dropdownContent() {
    return (
      <React.Fragment>
        <List.Dropdown.Item title="All" value="all" />
        <List.Dropdown.Section title="Tags" />
        {tags.map((tag: string) => (
          <List.Dropdown.Item title={tag} value={tag} key={tag} />
        ))}
      </React.Fragment>
    );
  }

  function dropdownWithDefault() {
    return (
      <List.Dropdown tooltip="Search For" defaultValue={defaultTagValue() ?? ""} onChange={handleChange}>
        {dropdownContent()}
      </List.Dropdown>
    );
  }

  function dropdownWithoutDefault() {
    return (
      <List.Dropdown tooltip="Search For" defaultValue="all" onChange={handleChange}>
        {dropdownContent()}
      </List.Dropdown>
    );
  }

  function DropDownList() {
    const defaultValue = defaultTagValue();
    if (defaultValue) {
      return dropdownWithDefault();
    } else {
      return dropdownWithoutDefault();
    }
  }

  return <DropDownList />;
}
