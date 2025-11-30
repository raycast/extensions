import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useStorage } from "../hooks/useStorage";
import type { TagGroup } from "../types";

interface EditTagGroupProps {
  group: TagGroup;
  onUpdated?: () => void;
}

export function EditTagGroup({ group, onUpdated }: EditTagGroupProps) {
  const { updateTagGroup, data } = useStorage();
  const { pop } = useNavigation();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Group name required",
      });
      return;
    }

    // Check if new name conflicts
    if (name.trim() !== group.name) {
      const existingGroup = data.tagGroups.find(
        (g) => g.name.toLowerCase() === name.trim().toLowerCase() && g.id !== group.id,
      );
      if (existingGroup) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Group already exists",
          message: `"${name}" is already a tag group`,
        });
        return;
      }
    }

    await updateTagGroup(group.id, {
      name: name.trim(),
      description: description || undefined,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Group updated!",
      message: name.trim(),
    });

    onUpdated?.();
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit "${group.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Group" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Group Name"
        placeholder="Backend, Frontend, Tools..."
        value={name}
        onChange={setName}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={description}
        onChange={setDescription}
      />

      <Form.Description title="Created" text={new Date(group.createdAt).toLocaleDateString()} />
    </Form>
  );
}
