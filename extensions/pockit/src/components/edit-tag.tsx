// src/components/EditTag.tsx
import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { normalizeTagName, TAG_COLORS } from "../utils/tags";
import type { Tag } from "../types";

interface EditTagProps {
  tag: Tag;
  onUpdated?: () => void;
}

export function EditTag({ tag, onUpdated }: EditTagProps) {
  const { updateTag, data } = useStorage();
  const { pop } = useNavigation();
  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState(tag.description || "");
  const [color, setColor] = useState(tag.color || "#3B82F6");
  const [groupId, setGroupId] = useState(tag.groupId);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tag name required",
      });
      return;
    }

    const normalized = normalizeTagName(name);

    // Check if new name conflicts with existing tag
    if (normalized !== tag.name) {
      const existingTag = data.tags.find((t) => t.name === normalized && t.id !== tag.id);
      if (existingTag) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Tag already exists",
          message: `"${normalized}" is already in your tags`,
        });
        return;
      }
    }

    await updateTag(tag.id, {
      name: normalized,
      description: description || undefined,
      color,
      groupId,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Tag updated!",
      message: normalized,
    });

    onUpdated?.();
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit "${tag.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tag" icon={Icon.Check} onSubmit={handleSubmit} />
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

      <Form.Description title="Created" text={new Date(tag.createdAt).toLocaleDateString()} />
    </Form>
  );
}
