import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  WindowManagement,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getDesktopContext } from "./utils";
import { deleteSavedLayout, getSavedLayouts, type SavedLayout } from "./utils/saved-layouts";

export default function Command() {
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLayouts() {
    setIsLoading(true);
    const saved = await getSavedLayouts();
    setLayouts(saved);
    setIsLoading(false);
  }

  useEffect(() => {
    loadLayouts();
  }, []);

  async function handleRestore(layout: SavedLayout) {
    const context = await getDesktopContext();
    if (!context) return;

    const usedWindowIds = new Set<string>();
    let restored = 0;

    for (const saved of layout.windows) {
      const match = context.windows.find(
        (w) => !usedWindowIds.has(w.id) && (w.application?.name ?? "").toLowerCase() === saved.appName.toLowerCase(),
      );
      if (match) {
        usedWindowIds.add(match.id);
        try {
          await WindowManagement.setWindowBounds({
            id: match.id,
            desktopId: context.desktop.id,
            bounds: {
              position: { x: saved.bounds.x, y: saved.bounds.y },
              size: { width: saved.bounds.width, height: saved.bounds.height },
            },
          });
          restored++;
        } catch (err) {
          console.error(`Failed to restore ${saved.appName}:`, err);
        }
      }
    }

    await closeMainWindow();
    await showToast({
      style: restored > 0 ? Toast.Style.Success : Toast.Style.Failure,
      title: restored > 0 ? `Restored ${restored} window(s)` : "No matching windows found",
    });
  }

  async function handleDelete(layout: SavedLayout) {
    const isConfirmed = await confirmAlert({
      title: `Delete "${layout.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });

    if (!isConfirmed) return;

    await deleteSavedLayout(layout.name);
    await loadLayouts();
    await showToast({ style: Toast.Style.Success, title: `Deleted "${layout.name}"` });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved layouts...">
      {layouts.length === 0 && !isLoading ? (
        <List.EmptyView title="No Saved Layouts" description="Use 'Save Current Layout' to save window positions." />
      ) : (
        layouts.map((layout) => (
          <List.Item
            key={layout.name}
            title={layout.name}
            subtitle={`${layout.windows.length} window(s)`}
            accessories={[{ text: new Date(layout.savedAt).toLocaleDateString() }]}
            actions={
              <ActionPanel>
                <Action title="Restore Layout" icon={Icon.ArrowClockwise} onAction={() => handleRestore(layout)} />
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
