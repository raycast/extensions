import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useStorage } from "../hooks/useStorage";

interface CreateTagGroupProps {
  onCreated?: () => void;
}

export function CreateTagGroup({ onCreated }: CreateTagGroupProps) {
  const { addTagGroup, data } = useStorage();
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Group name required",
      });
      return;
    }

    // Check if group already exists
    const existingGroup = data.tagGroups.find((g) => g.name.toLowerCase() === name.trim().toLowerCase());
    if (existingGroup) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Group already exists",
        message: `"${name}" is already a tag group`,
      });
      return;
    }

    await addTagGroup({
      name: name.trim(),
      description: description || undefined,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Tag group created!",
      message: name.trim(),
    });

    onCreated?.();
    pop();
  }

  return (
    <Form
      navigationTitle="Create Tag Group"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Group" icon={Icon.PlusSquare} onSubmit={handleSubmit} />
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
    </Form>
  );
}
