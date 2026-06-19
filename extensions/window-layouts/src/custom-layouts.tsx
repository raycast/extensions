import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CreateCustomLayout } from "./create-custom-layout";
import { createLayout } from "./utils";
import { deleteCustomLayout, getCustomLayouts, type CustomLayout } from "./utils/custom-layouts";

export default function Command() {
  const [layouts, setLayouts] = useState<CustomLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLayouts() {
    setIsLoading(true);
    const all = await getCustomLayouts();
    setLayouts(all);
    setIsLoading(false);
  }

  useEffect(() => {
    loadLayouts();
  }, []);

  async function handleApply(layout: CustomLayout) {
    await createLayout(layout.grid);
  }

  async function handleDelete(layout: CustomLayout) {
    const isConfirmed = await confirmAlert({
      title: `Delete "${layout.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });

    if (!isConfirmed) return;

    await deleteCustomLayout(layout.name);
    await loadLayouts();
    await showToast({ style: Toast.Style.Success, title: `Deleted "${layout.name}"` });
  }

  function gridPreview(grid: number[][]): string {
    const rows = grid.length;
    const firstRow = grid[0];
    if (rows === 0 || !Array.isArray(firstRow)) {
      return "Invalid grid";
    }
    const cols = firstRow.length;
    const windowCount = new Set(grid.flat()).size;
    return `${rows}×${cols} grid, ${windowCount} windows`;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search custom layouts...">
      {layouts.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Custom Layouts"
          description="Use 'Create Custom Layout' to define your own grid layouts."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Custom Layout"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<CreateCustomLayout onCreate={loadLayouts} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        layouts.map((layout) => (
          <List.Item
            key={layout.name}
            title={layout.name}
            subtitle={gridPreview(layout.grid)}
            accessories={[{ text: new Date(layout.createdAt).toLocaleDateString() }]}
            actions={
              <ActionPanel>
                <Action title="Apply Layout" icon={Icon.Check} onAction={() => handleApply(layout)} />
                <Action.Push
                  title="Create Custom Layout"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<CreateCustomLayout onCreate={loadLayouts} />}
                />
                <Action
                  title="Delete Layout"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(layout)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
