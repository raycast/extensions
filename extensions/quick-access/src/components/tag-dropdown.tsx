import React from "react";
import { Icon, List } from "@raycast/api";
import { rememberTag } from "../types/preferences";
import { DirectoryTags } from "../utils/constants";
import { TypeDirectory } from "../types/types";

export function TagDropdown(props: {
  setTag: React.Dispatch<React.SetStateAction<string>>;
  directoryWithFiles: TypeDirectory[];
}) {
  const { setTag, directoryWithFiles } = props;
  return (
    <List.Dropdown onChange={setTag} tooltip={"File type"} storeValue={rememberTag}>
      <List.Dropdown.Item key={"All"} icon={Icon.Tag} title={"All"} value={"All"} />
      {directoryWithFiles.map((typeDirectory) => (
        <List.Dropdown.Section key={typeDirectory.type} title={typeDirectory.type}>
          {typeDirectory.directories.map((value, index) => {
            return (
              <List.Dropdown.Item
                key={index + value.directory.name}
                icon={{ fileIcon: value.directory.path }}
                title={value.directory.name}
                value={value.directory.name}
              />
            );
          })}
        </List.Dropdown.Section>
      ))}
      <List.Dropdown.Section title={"Type"}>
        {DirectoryTags.map((directoryType, index) => {
          return (
            <List.Dropdown.Item
              key={index + directoryType.title}
              icon={directoryType.icon}
              title={directoryType.title}
              value={directoryType.title}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
