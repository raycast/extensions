import { Note, SearchArguments } from "../../utils/interfaces";
import { List } from "@raycast/api";
import React from "react";

export function NoteListDropdown(props: {
  allNotes?: Note[];
  setNotes?: (notes: Note[]) => void;
  tags: string[];
  searchArguments: SearchArguments;
}) {
  const { setNotes, allNotes, tags, searchArguments } = props;

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
    if (setNotes && allNotes) {
      if (value != "all") {
        if (setNotes) {
          setNotes(allNotes.filter((note) => note.tags.includes(value)));
        }
      } else {
        if (setNotes) {
          setNotes(allNotes);
        }
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
