import React from "react";
import { List } from "@raycast/api";
import { tags } from "../tags";

const TagDropdown = ({
  selectedTag,
  setSelectedTag,
}: {
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
}) => {
  //console.log("Rendering TagDropdown with tags:", tags);

  return (
    <List.Dropdown tooltip="Filter by Tag" storeValue={true} onChange={setSelectedTag} value={selectedTag}>
      <List.Dropdown.Item title="All" value="" /> {/* Option to deselect tag */}
      {Object.entries(tags).map(([section, tags]) => (
        <List.Dropdown.Section key={section} title={section}>
          {tags.map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
};

export default React.memo(TagDropdown);
