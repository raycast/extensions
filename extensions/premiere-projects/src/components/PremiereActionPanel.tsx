import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { currentPlatformAdapter } from "../platforms";
import { clearPremiereMediaCaches } from "../services/cache";
import { safeTrashProject } from "../services/file-operations";
import { PremiereFile, ViewMode } from "../types";
import { isMediaEncoderInstalled, openInMediaEncoder } from "../utils/adobeApps";
import { EditDateForm } from "./EditDateForm";
import { RenameForm } from "./RenameForm";

interface PremiereActionPanelProps {
  file: PremiereFile;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onRefresh?: () => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (deletedPath: string) => void;
}

export function PremiereActionPanel({
  file,
  viewMode,
  onToggleViewMode,
  onRefresh,
  onFileRenamed,
  onFileDeleted,
}: PremiereActionPanelProps) {
  const hasMediaEncoder = isMediaEncoderInstalled();

  const handleOpenInPremiere = async () => {
    try {
      await currentPlatformAdapter.openInPremiere(file.path);
    } catch (err: unknown) {
      await showFailureToast(err, { title: "Failed to open in Premiere Pro" });
    }
  };

  const handleClearCache = async () => {
    const options: Alert.Options = {
      title: "Purge Premiere Pro Media Cache?",
      message:
        "This will delete temporary Media Cache, Media Cache Files, and Peak Files (such as .cfa and .pek). Premiere Pro will regenerate them automatically when needed.",
      primaryAction: {
        title: "Clear Media Cache",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Purging Premiere Pro cache...",
      });
      try {
        const res = await clearPremiereMediaCaches();
        if (res.success && (!res.failedCount || res.failedCount === 0)) {
          toast.style = Toast.Style.Success;
          toast.title = "Media cache cleared";
          toast.message = `Freed ${res.formattedFreedSpace} of disk space`;
          if (onRefresh) onRefresh();
        } else if (res.totalFreed > 0 && res.failedCount && res.failedCount > 0) {
          toast.style = Toast.Style.Failure;
          toast.title = "Partially cleared media cache";
          toast.message = `Freed ${res.formattedFreedSpace}, but ${res.failedCount} file(s) could not be deleted (files may be in use by Premiere Pro)`;
          if (onRefresh) onRefresh();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to clear cache";
          toast.message =
            res.error ||
            (res.failedCount
              ? `${res.failedCount} file(s) could not be deleted (files may be in use by Premiere Pro)`
              : "No files were deleted.");
        }
      } catch (err: unknown) {
        await showFailureToast(err, { title: "Failed to purge cache" });
      }
    }
  };

  const handleDelete = async () => {
    const options: Alert.Options = {
      title: `Delete "${file.name}"?`,
      message: "Are you sure you want to move this Premiere Pro project to the Trash?",
      primaryAction: {
        title: "Delete Project",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting project...",
      });
      try {
        await safeTrashProject(file.path);
        toast.style = Toast.Style.Success;
        toast.title = "Project deleted";
        if (onFileDeleted) {
          onFileDeleted(file.path);
        } else if (onRefresh) {
          onRefresh();
        }
      } catch (err: unknown) {
        await showFailureToast(err, { title: "Failed to delete project" });
      }
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Open in Adobe Premiere Pro" icon={Icon.Video} onAction={handleOpenInPremiere} />
        <Action.ShowInFinder title="Reveal in File Manager" path={file.path} />
        {hasMediaEncoder && (
          <Action
            title="Open in Adobe Media Encoder"
            icon={Icon.FilmStrip}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "m" },
              Windows: { modifiers: ["ctrl"], key: "m" },
            }}
            onAction={async () => {
              try {
                await openInMediaEncoder(file.path);
              } catch (err) {
                await showFailureToast(err, { title: "Failed to open in Media Encoder" });
              }
            }}
          />
        )}
        <Action.ToggleQuickLook title="Quick Look Preview" shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Edit & Manage">
        <Action.Push
          title="Rename Project"
          icon={Icon.Pencil}
          shortcut={{
            macOS: { modifiers: ["opt", "cmd"], key: "r" },
            Windows: { modifiers: ["alt", "ctrl"], key: "r" },
          }}
          target={
            <RenameForm
              file={file}
              onRenamed={(newPath) => {
                if (onFileRenamed) onFileRenamed(file.path, newPath);
                if (onRefresh) onRefresh();
              }}
            />
          }
        />
        <Action.Push
          title="Edit Date (Backdate / Frontdate)"
          icon={Icon.Calendar}
          shortcut={{
            macOS: { modifiers: ["opt", "cmd"], key: "d" },
            Windows: { modifiers: ["alt", "ctrl"], key: "d" },
          }}
          target={<EditDateForm file={file} onUpdated={onRefresh} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="View">
        <Action
          title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
          icon={viewMode === "grid" ? Icon.List : Icon.AppWindowGrid2x2}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "v" },
            Windows: { modifiers: ["ctrl"], key: "v" },
          }}
          onAction={onToggleViewMode}
        />
        {onRefresh && (
          <Action
            title="Refresh Projects"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="File Actions">
        <Action.CopyToClipboard
          title="Copy File Path"
          content={file.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard title="Copy File" content={{ file: file.path }} />
        <Action
          title="Clear Media Cache"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{
            macOS: { modifiers: ["opt", "cmd"], key: "k" },
            Windows: { modifiers: ["alt", "ctrl"], key: "k" },
          }}
          onAction={handleClearCache}
        />
        <Action
          title="Delete Project"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{
            macOS: { modifiers: ["ctrl"], key: "x" },
            Windows: { modifiers: ["ctrl"], key: "x" },
          }}
          onAction={handleDelete}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
