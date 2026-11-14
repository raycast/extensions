/**
 * Copied from raycast/extensions' extensions/raindrop-io/src/components/
 * CollectionsDropdown.tsx (MIT, commit 4cd99da7). Uses stable list keys and
 * native labels/icons; equal collection names and paths are displayed once.
 */
import React from "react";
import { Color, Icon, List } from "@raycast/api";
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
    <List.Dropdown onChange={handleChange} tooltip="Select Collection" value={defaultValue || "0"}>
      <List.Dropdown.Item title="All Bookmarks" value="0" />
      <List.Dropdown.Item title="Unsorted" value="-1" />
      <List.Dropdown.Section title="Collections">
        {collections?.map((collection: CollectionItem) => (
          <List.Dropdown.Item
            key={collection.value}
            title={
              collection.name && collection.name !== collection.label
                ? `${collection.name} (${collection.label})`
                : collection.label
            }
            value={`${collection.value}`}
            icon={
              collection.cover
                ? {
                    source: collection.cover,
                    tintColor: collection.cover.startsWith("collection-icons/twemoji-") ? undefined : Color.PrimaryText,
                  }
                : { source: Icon.Folder }
            }
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Item title="Trash" value="-99" icon={Icon.Trash} />
    </List.Dropdown>
  );
});

export default CollectionsDropdown;
