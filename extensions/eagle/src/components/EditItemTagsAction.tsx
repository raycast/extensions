import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updateItem } from "../utils/api";
import type { Item } from "../@types/eagle";

interface EditItemTagsActionProps {
  item: Item;
  onUpdate?: () => void;
}

function EditTagsForm({ item, onUpdate }: EditItemTagsActionProps) {
  const [tags, setTags] = useState(item.tags.join(", "));
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating tags...",
      });

      await updateItem({
        id: item.id,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Tags updated",
      });

      if (onUpdate) {
        onUpdate();
      }

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update tags",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tags" icon={Icon.Tag} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2, tag3"
        value={tags}
        onChange={setTags}
        info="Comma-separated list of tags"
      />
      <Form.Description title="Current Tags" text={item.tags.length > 0 ? item.tags.join(", ") : "No tags"} />
    </Form>
  );
}

export function EditItemTagsAction({ item, onUpdate }: EditItemTagsActionProps) {
  return (
    <Action.Push
      title="Edit Tags"
      icon={Icon.Tag}
      target={<EditTagsForm item={item} onUpdate={onUpdate} />}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
    />
  );
}
