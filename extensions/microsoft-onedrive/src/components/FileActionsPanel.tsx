import { Action, ActionPanel, Application, Icon, Keyboard } from "@raycast/api";
import type { BreadcrumbPath, Drive, DriveItem, SortConfig } from "../types";
import { getDriveName, getOfficeAppName } from "../utils/display";
import { UploadForm } from "./UploadForm";

interface FileActionsPanelProps {
  item: DriveItem;
  installedOfficeApps: Map<string, Application>;
  // Optional - only for Search Files command
  navigation?: {
    currentFolder: BreadcrumbPath | null;
    onNavigateDown: (folder: DriveItem) => void;
    onNavigateUp: () => void;
  };
  sorting?: {
    config: SortConfig;
    onChange: (field: SortConfig["field"]) => void;
  };
  upload?: {
    currentDrive: Drive;
    onComplete: () => void;
  };
  onDelete: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onReveal: (item: DriveItem) => void;
  onCreateShareLink: (item: DriveItem, scope: "anonymous" | "organization", expirationDays?: number) => void;
}

export function FileActionsPanel({
  item,
  installedOfficeApps,
  navigation,
  sorting,
  upload,
  onDelete,
  onDownload,
  onReveal,
  onCreateShareLink,
}: FileActionsPanelProps) {
  const appKey = getOfficeAppName(item);
  const officeApp = appKey ? installedOfficeApps.get(appKey) : undefined;

  return (
    <ActionPanel title={item.name}>
      {/* Primary Actions */}
      <Action.OpenInBrowser url={item.webUrl} icon={Icon.Globe} />

      <Action
        title={`Reveal in ${getDriveName(item.parentReference?.driveType)}`}
        icon={Icon.Globe}
        onAction={() => onReveal(item)}
      />

      {appKey && item.webDavUrl && officeApp && (
        <Action.Open
          title={`Open in ${officeApp.name}`}
          icon={{ fileIcon: officeApp.path }}
          shortcut={Keyboard.Shortcut.Common.Open}
          target={item.webDavUrl}
          application={officeApp}
        />
      )}

      {/* Navigation */}
      {navigation && (
        <ActionPanel.Section>
          {item.folder && (
            <Action
              title="Enter Directory"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => navigation.onNavigateDown(item)}
            />
          )}

          {navigation.currentFolder && (
            <Action
              title="Go to Parent Directory"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["shift"], key: "tab" }}
              onAction={navigation.onNavigateUp}
            />
          )}
        </ActionPanel.Section>
      )}

      {/* Sort Options */}
      {sorting && (
        <ActionPanel.Section>
          <ActionPanel.Submenu
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Sort Search Results By"
            icon={Icon.ArrowDown}
            shortcut={{
              macOS: { modifiers: ["opt", "cmd"], key: "s" },
              Windows: { modifiers: ["alt", "ctrl"], key: "s" },
            }}
          >
            <Action
              title="Relevance"
              icon={sorting.config.field === "relevance" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => sorting.onChange("relevance")}
            />
            <Action
              title="Last Modified"
              icon={sorting.config.field === "lastModifiedDateTime" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => sorting.onChange("lastModifiedDateTime")}
            />
          </ActionPanel.Submenu>
        </ActionPanel.Section>
      )}

      {/* Links & Sharing */}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Direct Link"
          icon={Icon.Link}
          content={item.webUrl}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />

        <Action.CreateQuicklink
          title="Create Quicklink"
          quicklink={{ link: item.webUrl, name: item.name }}
          shortcut={{
            macOS: { modifiers: ["shift", "cmd"], key: "q" },
            Windows: { modifiers: ["shift", "ctrl"], key: "q" },
          }}
        />

        <ActionPanel.Submenu
          title="Share with Anyone"
          icon={Icon.Globe}
          shortcut={{
            macOS: { modifiers: ["shift", "cmd"], key: "s" },
            Windows: { modifiers: ["shift", "ctrl"], key: "s" },
          }}
        >
          <ActionPanel.Section title="Expire in">
            <Action title="24 Hours" icon={Icon.Clock} onAction={() => onCreateShareLink(item, "anonymous", 1)} />
            <Action title="7 Days" icon={Icon.Calendar} onAction={() => onCreateShareLink(item, "anonymous", 7)} />
            <Action title="30 Days" icon={Icon.Calendar} onAction={() => onCreateShareLink(item, "anonymous", 30)} />
            <Action title="Never" icon={Icon.ArrowClockwise} onAction={() => onCreateShareLink(item, "anonymous")} />
          </ActionPanel.Section>
        </ActionPanel.Submenu>

        <ActionPanel.Submenu
          title="Share with Organization"
          icon={Icon.TwoPeople}
          shortcut={{
            macOS: { modifiers: ["shift", "cmd"], key: "o" },
            Windows: { modifiers: ["shift", "ctrl"], key: "o" },
          }}
        >
          <ActionPanel.Section title="Expire in">
            <Action title="24 Hours" icon={Icon.Clock} onAction={() => onCreateShareLink(item, "organization", 1)} />
            <Action title="7 Days" icon={Icon.Calendar} onAction={() => onCreateShareLink(item, "organization", 7)} />
            <Action title="30 Days" icon={Icon.Calendar} onAction={() => onCreateShareLink(item, "organization", 30)} />
            <Action title="90 Days" icon={Icon.Calendar} onAction={() => onCreateShareLink(item, "organization", 90)} />
            <Action title="Never" icon={Icon.ArrowClockwise} onAction={() => onCreateShareLink(item, "organization")} />
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      </ActionPanel.Section>

      {/* File Operations */}
      <ActionPanel.Section>
        {upload && (
          <Action.Push
            title="Upload to Current Directory"
            icon={Icon.Upload}
            shortcut={{
              macOS: { modifiers: ["shift", "cmd"], key: "u" },
              Windows: { modifiers: ["shift", "ctrl"], key: "u" },
            }}
            target={
              <UploadForm
                destinationFolder={
                  navigation?.currentFolder
                    ? ({ id: navigation.currentFolder.id, name: navigation.currentFolder.name } as DriveItem)
                    : ({ id: "root", name: upload.currentDrive.name } as DriveItem)
                }
                driveId={upload.currentDrive.id}
                onUploadComplete={upload.onComplete}
              />
            }
          />
        )}

        {!item.folder && (
          <Action
            title="Download File"
            icon={Icon.Download}
            onAction={() => onDownload(item)}
            shortcut={{
              macOS: { modifiers: ["shift", "cmd"], key: "d" },
              Windows: { modifiers: ["shift", "ctrl"], key: "d" },
            }}
          />
        )}

        <Action
          title={item.folder ? "Delete Directory" : "Delete File"}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => onDelete(item)}
          shortcut={Keyboard.Shortcut.Common.Remove}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * Empty folder actions panel (for when folder is empty)
 */
interface EmptyFolderActionsPanelProps {
  currentFolder: BreadcrumbPath | null;
  currentDrive: Drive | null;
  onNavigateUp: () => void;
  onUploadComplete: () => void;
}

export function EmptyFolderActionsPanel({
  currentFolder,
  currentDrive,
  onNavigateUp,
  onUploadComplete,
}: EmptyFolderActionsPanelProps) {
  return (
    <ActionPanel title={currentFolder?.name || currentDrive?.name || "Root"}>
      {currentFolder && (
        <Action
          title="Go to Parent Directory"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["shift"], key: "tab" }}
          onAction={onNavigateUp}
        />
      )}

      {currentDrive && (
        <Action.Push
          title="Upload to Current Directory"
          icon={Icon.Upload}
          shortcut={{
            macOS: { modifiers: ["shift", "cmd"], key: "u" },
            Windows: { modifiers: ["shift", "ctrl"], key: "u" },
          }}
          target={
            <UploadForm
              destinationFolder={
                currentFolder
                  ? ({ id: currentFolder.id, name: currentFolder.name } as DriveItem)
                  : ({ id: "root", name: currentDrive.name } as DriveItem)
              }
              driveId={currentDrive.id}
              onUploadComplete={onUploadComplete}
            />
          }
        />
      )}
    </ActionPanel>
  );
}
