import { Action, ActionPanel, Icon, open } from "@raycast/api";
import { FileInfo, Preferences } from "../types";
import { openFileFound, runAsAdministrator, showInExplorer, copyFileWithApi } from "../services/fileOperations";
import { isExecutableFile } from "../utils/file";

interface FileActionPanelProps {
  file: FileInfo | null;
  preferences: Preferences;
  onToggleDetails: () => void;
  children?: React.ReactNode;
}

export function FileActionPanel({ file, preferences, onToggleDetails, children }: FileActionPanelProps) {
  if (!file) return null;

  const openFolderAsDefault = preferences.openFolderAsDefault;
  const isExecutable = isExecutableFile(file.commandline);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {openFolderAsDefault ? (
          <>
            <Action
              title="Show in Explorer"
              icon={Icon.Folder}
              onAction={() => showInExplorer(file.commandline, preferences)}
            />
            <Action
              title="Open"
              icon={Icon.Document}
              onAction={() => (file.isDirectory ? open(file.commandline) : openFileFound(file))}
            />
          </>
        ) : (
          <>
            <Action
              title="Open"
              icon={Icon.Document}
              onAction={() => (file.isDirectory ? open(file.commandline) : openFileFound(file))}
            />
            <Action
              title="Show in Explorer"
              icon={Icon.Folder}
              onAction={() => showInExplorer(file.commandline, preferences)}
            />
          </>
        )}

        {isExecutable && (
          <Action
            title="Run as Administrator"
            icon={Icon.Shield}
            onAction={() => runAsAdministrator(file.commandline)}
          />
        )}
        <Action
          title="Toggle Details"
          icon={Icon.AppWindowSidebarLeft}
          onAction={onToggleDetails}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "i" },
            windows: { modifiers: ["ctrl", "shift"], key: "i" },
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy File"
          icon={Icon.Clipboard}
          onAction={() => copyFileWithApi(file)}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "." },
            windows: { modifiers: ["ctrl", "shift"], key: "." },
          }}
        />
        <Action.CopyToClipboard
          title="Copy Name"
          content={file.name}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "c" },
            windows: { modifiers: ["ctrl"], key: "c" },
          }}
        />
        <Action.CopyToClipboard
          title="Copy Path"
          content={file.commandline}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "c" },
            windows: { modifiers: ["ctrl", "shift"], key: "c" },
          }}
        />
      </ActionPanel.Section>
      {children && <>{children}</>}
    </ActionPanel>
  );
}
