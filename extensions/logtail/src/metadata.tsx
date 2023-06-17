import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { CustomMetadataTag, useMetadataTags } from "./hooks/useMetadataTags";
import AddMetadataTagCommand from "./add-metadata";

const ViewMetadataCommand = () => {
  const { data, isLoading, removeMetadataTag } = useMetadataTags();
  const tags = data ?? [];

  const [editingTag, setEditingTag] = useState<CustomMetadataTag | undefined>(undefined);
  const [isAddingTag, setAddingTag] = useState<boolean>(false);

  const handleRemoveTag = async (tag: CustomMetadataTag) => {
    await removeMetadataTag(tag.key);
  };

  const handleEditTag = (tag: CustomMetadataTag) => {
    setEditingTag(tag);
  };

  const handleAddTag = () => {
    setAddingTag(true);
  };

  if (editingTag) {
    return <AddMetadataTagCommand isEditing tag={editingTag} />;
  } else if (isAddingTag) {
    return <AddMetadataTagCommand />;
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Metadata Tag" icon={Icon.Tag} onSubmit={handleAddTag} />
        </ActionPanel>
      }
    >
      {tags.map((tag) => (
        <List.Item
          key={tag.key}
          title={tag.label}
          subtitle={tag.key}
          icon={{ tintColor: tag.color, source: Icon.Tag }}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Edit Metadata Tag"
                icon={Icon.Pencil}
                onSubmit={handleEditTag.bind(this, tag)}
              />
              <Action.SubmitForm
                title="Remove Metadata Tag"
                icon={Icon.Trash}
                onSubmit={handleRemoveTag.bind(this, tag)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!tags.length && <List.EmptyView title="No metadata tags found" />}
    </List>
  );
};

export default ViewMetadataCommand;
