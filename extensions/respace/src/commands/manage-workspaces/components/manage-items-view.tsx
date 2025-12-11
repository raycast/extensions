import { randomUUID } from "node:crypto";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { updateWorkspace } from "../../../core/storage/storage";
import type { Workspace, WorkspaceItem } from "../../../types/workspace";
import {
  getItemColor,
  getItemIcon,
  getItemSubtitle,
  getTypeName,
} from "../utils/workspace-helpers";
import { AddItemForm } from "./add-item-form";
import { EditItemForm } from "./edit-item-form";

interface ManageItemsViewProps {
  workspace: Workspace;
  onWorkspaceUpdated: () => void;
}

export function ManageItemsView({
  workspace,
  onWorkspaceUpdated,
}: ManageItemsViewProps) {
  const { pop } = useNavigation();
  const [items, setItems] = useState<WorkspaceItem[]>(workspace.items);

  async function handleDeleteItem(itemId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Item",
      message: "Are you sure you want to remove this item from the workspace?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const newItems = items.filter((item) => item.id !== itemId);
      setItems(newItems);
      updateWorkspace(workspace.id, { items: newItems });
      onWorkspaceUpdated();
      await showToast({ style: Toast.Style.Success, title: "Item removed" });
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [
      newItems[index],
      newItems[index - 1],
    ];
    setItems(newItems);
    updateWorkspace(workspace.id, { items: newItems });
    onWorkspaceUpdated();
  }

  async function handleMoveDown(index: number) {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [
      newItems[index + 1],
      newItems[index],
    ];
    setItems(newItems);
    updateWorkspace(workspace.id, { items: newItems });
    onWorkspaceUpdated();
  }

  return (
    <List
      navigationTitle={`Items in ${workspace.name}`}
      searchBarPlaceholder="Search items..."
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="No Items"
        description="Add items to this workspace"
        actions={
          <ActionPanel>
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
                    const newItems = [...items, newItem];
                    setItems(newItems);
                    updateWorkspace(workspace.id, { items: newItems });
                    onWorkspaceUpdated();
                    pop();
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />
      {items.map((item, index) => (
        <List.Item
          key={item.id}
          icon={{
            source: getItemIcon(item.type),
            tintColor: getItemColor(item.type),
          }}
          title={item.name}
          subtitle={getItemSubtitle(item.type, item.path)}
          accessories={[
            ...(item.delay
              ? [
                  {
                    tag: {
                      value: `${item.delay}ms delay`,
                      color: Color.Orange,
                    },
                  },
                ]
              : []),
            {
              tag: {
                value: getTypeName(item.type),
                color: getItemColor(item.type),
              },
            },
            { text: `#${index + 1}` },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Edit">
                <Action.Push
                  title="Edit Item"
                  icon={Icon.Pencil}
                  target={
                    <EditItemForm
                      item={item}
                      onItemUpdated={(updatedItem) => {
                        const newItems = items.map((i) =>
                          i.id === item.id
                            ? { ...updatedItem, id: item.id }
                            : i,
                        );
                        setItems(newItems);
                        updateWorkspace(workspace.id, { items: newItems });
                        onWorkspaceUpdated();
                        pop();
                      }}
                    />
                  }
                />
                <Action.Push
                  title="Add New Item"
                  icon={Icon.Plus}
                  target={
                    <AddItemForm
                      onItemAdded={(newItem) => {
                        const itemWithId: WorkspaceItem = {
                          ...newItem,
                          id: `item-${randomUUID()}`,
                        };
                        const newItems = [...items, itemWithId];
                        setItems(newItems);
                        updateWorkspace(workspace.id, { items: newItems });
                        onWorkspaceUpdated();
                        pop();
                      }}
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Reorder">
                {index > 0 && (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() => handleMoveUp(index)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  />
                )}
                {index < items.length - 1 && (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    onAction={() => handleMoveDown(index)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove Item"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteItem(item.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
