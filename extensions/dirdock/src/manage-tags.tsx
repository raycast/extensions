// src/manage-tags.tsx

import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { getTags, removeTag, Tag } from "./utils/storage";
import { useEffect, useState } from "react";
import { EditTagCommand } from "./edit-tag";

export default function ManageTagsCommand() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const fetchedTags = await getTags();
      setTags(fetchedTags);
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Failed to Load Tags", error.message);
      } else {
        showToast(Toast.Style.Failure, "Failed to Load Tags", "An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleDelete = async (tag: Tag) => {
    try {
      await removeTag(tag.id);
      showToast(Toast.Style.Success, "Tag Deleted", `${tag.name} has been deleted.`);
      fetchTags();
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Failed to Delete Tag", error.message);
      } else {
        showToast(Toast.Style.Failure, "Failed to Delete Tag", "An unknown error occurred.");
      }
    }
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search tags...">
      {tags.map((tag) => (
        <List.Item
          key={tag.id}
          title={tag.name}
          icon={{ source: "tag-icon.png", tintColor: tag.color }} // Ensure you have tag-icon.png in assets
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Tag"
                target={<EditTagCommand tag={tag} onEdit={fetchTags} />}
                icon={Icon.Pencil}
              />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(tag)}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No tags found." description="Create a new tag using the Add Tag command." />
    </List>
  );
}
