import React from "react";
import { Icon, List } from "@raycast/api";
import { CollectionItem } from "../types";

type CollectionsDropdownProps = {
  isLoading: boolean;
  handleChange: (v: string) => void;
  collections: CollectionItem[];
  defaultValue?: string;
};

const CollectionsDropdown = React.memo(function CollectionsDropdown({
  isLoading,
  handleChange,
  collections,
  defaultValue,
}: CollectionsDropdownProps) {
  if (isLoading) return null;

  return (
    <List.Dropdown onChange={handleChange} tooltip="Select Collection" defaultValue={defaultValue}>
      <List.Dropdown.Item title="All bookmarks" value="0" />
      <List.Dropdown.Item title="Unsorted" value="-1" />
      <List.Dropdown.Section title="Collections">
        {collections?.map((collection: CollectionItem) => (
          <List.Dropdown.Item
            key={`${collection.value}_${Math.random().toString(16).substring(2, 8)}`}
            title={collection.name ? `${collection.name} (${collection.label})` : collection.label}
            value={`${collection.value}`}
            icon={collection.cover ? { source: collection.cover } : { source: Icon.Folder }}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Item title="🗑 Trash" value="-99" />
    </List.Dropdown>
  );
});

export default CollectionsDropdown;
