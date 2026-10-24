import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { clearPhotoshopCaches } from "../services/automation";
import { PhotoshopFile, ViewMode } from "../types";
import { openInNewFinderTab, openInNewFinderWindow } from "../utils/fileAttributes";
import { EditDateForm } from "./EditDateForm";
import { RenameForm } from "./RenameForm";

interface PhotoshopActionPanelProps {
  file: PhotoshopFile;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onRefresh?: () => void;
  onRenamed?: (newPath: string) => void;
}

export function PhotoshopActionPanel({
  file,
  viewMode,
  onToggleViewMode,
  onRefresh,
  onRenamed,
}: PhotoshopActionPanelProps) {
  const handleClearCache = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Photoshop Cache",
      message:
        "Purging Photoshop memory will clear the clipboard and undo history for any open documents in Photoshop. Scratch and thumbnail caches will also be removed. Are you sure you want to proceed?",
      primaryAction: {
        title: "Clear Cache",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Purging Photoshop caches...",
    });
    try {
      const res = await clearPhotoshopCaches(true);
      if (res.errors.length > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Cache partially cleared";
        toast.message = `Freed ${res.formattedFreedSpace}, but ${res.errors.length} item(s) failed to delete.`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Photoshop cache cleared";
        toast.message = `Freed ${res.formattedFreedSpace}${res.purgedMemory ? " & purged memory" : ""}`;
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to purge caches";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open
          title="Open in Adobe Photoshop"
          target={file.path}
          application="Adobe Photoshop"
          icon={Icon.Document}
        />
        <Action.ShowInFinder
          title="Reveal in Finder"
          path={file.path}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
        <Action.ToggleQuickLook title="Quick Look Preview" shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
        <Action
          title="Open in New Finder Window"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["shift", "cmd"], key: "return" }}
          onAction={async () => {
            await openInNewFinderWindow(file.path);
          }}
        />
        <Action
          title="Open in New Finder Tab"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["opt", "shift"], key: "t" }}
          onAction={async () => {
            await openInNewFinderTab(file.path);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Edit Attributes">
        <Action.Push
          title="Edit Date (Backdate / Frontdate)"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["opt", "cmd"], key: "d" }}
          target={<EditDateForm file={file} onUpdated={onRefresh} />}
        />
        <Action.Push
          title="Rename Document"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["opt", "cmd"], key: "r" }}
          target={<RenameForm file={file} onRenamed={onRenamed ?? onRefresh} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="View">
        <Action
          title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
          icon={viewMode === "grid" ? Icon.List : Icon.AppWindowGrid}
          shortcut={{ modifiers: ["cmd"], key: "v" }}
          onAction={onToggleViewMode}
        />
        {onRefresh && (
          <Action
            title="Refresh Files"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Photoshop Tools">
        <Action
          title="Clear Photoshop Cache"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["opt", "cmd"], key: "k" }}
          onAction={handleClearCache}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="File Actions">
        <Action.CopyToClipboard
          title="Copy File Path"
          content={file.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard
          title="Copy File"
          content={{ file: file.path }}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.OpenWith path={file.path} />
        <Action.Trash paths={[file.path]} shortcut={Keyboard.Shortcut.Common.Remove} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
