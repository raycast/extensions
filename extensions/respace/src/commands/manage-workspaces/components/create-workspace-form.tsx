import { randomUUID } from "node:crypto";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createWorkspace } from "../../../core/storage/storage";
import type { WorkspaceItem } from "../../../types/workspace";
import { WORKSPACE_ICONS } from "../constants/workspace-icons";
import { getTypeName } from "../utils/workspace-helpers";
import { AddItemForm } from "./add-item-form";

interface CreateWorkspaceFormProps {
  onWorkspaceCreated: () => void;
}

export function CreateWorkspaceForm({
  onWorkspaceCreated,
}: CreateWorkspaceFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>("Folder");
  const [items, setItems] = useState<Omit<WorkspaceItem, "id">[]>([]);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    try {
      const workspaceItems: WorkspaceItem[] = items.map((item) => ({
        ...item,
        id: `item-${randomUUID()}`,
      }));

      createWorkspace({
        name: name.trim(),
        description: description.trim(),
        icon: icon,
        items: workspaceItems,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Workspace created",
        message: name,
      });

      onWorkspaceCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Group icons by category
  const iconsByCategory = WORKSPACE_ICONS.reduce(
    (acc, iconOption) => {
      if (!acc[iconOption.category]) {
        acc[iconOption.category] = [];
      }
      acc[iconOption.category].push(iconOption);
      return acc;
    },
    {} as Record<string, typeof WORKSPACE_ICONS>,
  );

  return (
    <Form
      navigationTitle="Create Workspace"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Workspace"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action.Push
            title="Add Item"
            icon={Icon.Plus}
            target={
              <AddItemForm
                onItemAdded={(item) => {
                  setItems([...items, item]);
                  pop();
                }}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Workspace"
        value={name}
        onChange={setName}
      />
      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {Object.entries(iconsByCategory).map(([category, icons]) => (
          <Form.Dropdown.Section key={category} title={category}>
            {icons.map((iconOption) => (
              <Form.Dropdown.Item
                key={iconOption.name}
                value={iconOption.name}
                title={iconOption.name}
                icon={iconOption.icon}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Workspace description (optional)"
        value={description}
        onChange={setDescription}
      />
      <Form.Separator />
      <Form.Description
        title="Items"
        text={
          items.length === 0
            ? "No items added yet. Press ⌘N to add items."
            : `${items.length} item${items.length !== 1 ? "s" : ""} to be added:`
        }
      />
      {items.map((item, index) => (
        <Form.Description
          key={`${item.name}-${item.type}-${index}`}
          title={`${index + 1}. ${getTypeName(item.type)}`}
          text={`${item.name}${item.delay ? ` (${item.delay}ms delay)` : ""}`}
        />
      ))}
    </Form>
  );
}
