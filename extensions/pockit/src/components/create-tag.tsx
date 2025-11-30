import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { normalizeTagName, TAG_COLORS } from "../utils/tags";

interface CreateTagProps {
  onCreated?: () => void;
  defaultGroupId?: string;
}

export function CreateTag({ onCreated, defaultGroupId }: CreateTagProps) {
  const { addTag, data } = useStorage();
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [groupId, setGroupId] = useState(defaultGroupId || "");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tag name required",
      });
      return;
    }

    const normalized = normalizeTagName(name);

    // Check if tag already exists
    const existingTag = data.tags.find((t) => t.name === normalized);
    if (existingTag) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tag already exists",
        message: `"${normalized}" is already in your tags`,
      });
      return;
    }

    await addTag({
      name: normalized,
      description: description || undefined,
      color,
      groupId,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Tag created!",
      message: normalized,
    });

    onCreated?.();
    pop();
  }

  return (
    <Form
      navigationTitle="Create New Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Tag Name"
        placeholder="my-tag-name"
        value={name}
        onChange={setName}
        info="Spaces will be converted to hyphens"
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={description}
        onChange={setDescription}
      />
      <Form.Dropdown id="groupId" title="Group" value={groupId} onChange={setGroupId}>
        <Form.Dropdown.Item title="No Group" value="" />
        {data.tagGroups.map((group) => (
          <Form.Dropdown.Item key={group.id} value={group.id} title={group.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {TAG_COLORS.map((tagColor) => (
          <Form.Dropdown.Item
            key={tagColor.name}
            title={tagColor.name}
            value={tagColor.color}
            icon={{ source: Icon.Circle, tintColor: tagColor.color }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
