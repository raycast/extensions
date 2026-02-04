import { randomUUID } from "node:crypto";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updateWorkspace } from "../../../core/storage/storage";
import type { Workspace, WorkspaceItem } from "../../../types/workspace";
import { WORKSPACE_ICONS } from "../constants/workspace-icons";
import { getTypeName } from "../utils/workspace-helpers";
import { AddItemForm } from "./add-item-form";
import { ManageItemsView } from "./manage-items-view";

interface EditWorkspaceFormProps {
  workspace: Workspace;
  onWorkspaceUpdated: () => void;
}

export function EditWorkspaceForm({ workspace, onWorkspaceUpdated }: EditWorkspaceFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [icon, setIcon] = useState<string>(workspace.icon || "Folder");
  const [items, setItems] = useState<WorkspaceItem[]>(workspace.items);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    try {
      updateWorkspace(workspace.id, {
        name: name.trim(),
        description: description.trim(),
        icon: icon,
        items,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Workspace updated",
        message: name,
      });

      onWorkspaceUpdated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update workspace",
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
      navigationTitle={`Edit: ${workspace.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.Push
            title="Manage Items"
            icon={Icon.List}
            target={<ManageItemsView workspace={{ ...workspace, items }} onWorkspaceUpdated={onWorkspaceUpdated} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action.Push
            title="Add Item"
            icon={Icon.Plus}
            target={
              <AddItemForm
                onItemAdded={(item) => {
                  const newItem: WorkspaceItem = {
                    ...item,
                    id: `item-${randomUUID()}`,
                  };
                  setItems([...items, newItem]);
                  pop();
                }}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Workspace" value={name} onChange={setName} />
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
            ? "No items added yet. Press ⌘I to manage items."
            : `${items.length} item${items.length !== 1 ? "s" : ""} (⌘I to manage):`
        }
      />
      {items.map((item, index) => (
        <Form.Description
          key={item.id}
          title={`${index + 1}. ${getTypeName(item.type)}`}
          text={`${item.name}${item.delay ? ` (${item.delay}ms delay)` : ""}`}
        />
      ))}
    </Form>
  );
}
