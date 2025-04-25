import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Tag, TagForm, useTag } from "./features/tag";

export default function Command() {
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const { tags, isLoading, createTag, updateTag, deleteTag } = useTag();

  if (isCreatingTag) {
    return (
      <TagForm
        onSubmit={async (values) => {
          const success = await createTag({ name: values.name, color: values.color });
          if (success) {
            setIsCreatingTag(false);
          }
        }}
        onCancel={() => setIsCreatingTag(false)}
        submitTitle="Create Tag"
      />
    );
  }

  if (editingTag) {
    return (
      <TagForm
        onSubmit={async (values) => {
          const success = await updateTag({ ...editingTag, name: values.name, color: values.color });
          if (success) {
            setEditingTag(null);
          }
        }}
        onCancel={() => setEditingTag(null)}
        initialValues={{ name: editingTag.name, color: editingTag.color }}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="List Tags">
      {tags.map((tag) => (
        <List.Item
          key={tag.id}
          title={tag.name}
          icon={{ source: Icon.CircleFilled, tintColor: tag.color }}
          accessories={[
            {
              icon: Icon.Trash,
              tooltip: "Delete tag",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Pencil}
                title="Edit Tag"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => setEditingTag(tag)}
              />
              <Action
                icon={Icon.Plus}
                title="Create New Tag"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => setIsCreatingTag(true)}
              />
              <Action
                icon={Icon.Trash}
                title="Delete Tag"
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => deleteTag(tag.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
