import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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

  const handleClearCache = async () => {
    const options: Alert.Options = {
      title: "Purge Premiere Pro Media Cache?",
      message:
        "This will delete temporary conformed audio (.cfa) and waveform peak (.pek) files. Premiere Pro will regenerate them automatically when needed.",
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
        if (res.success) {
          toast.style = Toast.Style.Success;
          toast.title = "Media cache cleared";
          toast.message = `Freed ${res.formattedFreedSpace} of disk space`;
          if (onRefresh) onRefresh();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to clear cache";
          toast.message = res.error;
        }
      } catch (err: unknown) {
        await showFailureToast(err, { title: "Failed to purge cache" });
      }
    }
  };

  const handleDelete = async () => {
    const options: Alert.Options = {
      title: `Delete "${file.name}"?`,
      message: "Are you sure you want to delete this Premiere Pro project? This action cannot be undone.",
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
        <Action.Open
          title="Open in Adobe Premiere Pro"
          target={file.path}
          application="Adobe Premiere Pro"
          icon={Icon.Video}
        />
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
        {process.platform === "darwin" && (
          <Action
            title="Export in Media Encoder"
            icon={Icon.FilmStrip}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "e" },
              Windows: { modifiers: ["ctrl", "shift"], key: "e" },
            }}
            onAction={async () => {
              try {
                await openInMediaEncoder(file.path);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Export Queued in Media Encoder",
                  message: file.name,
                });
              } catch (err) {
                await showFailureToast(err, { title: "Failed to export in Media Encoder" });
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
