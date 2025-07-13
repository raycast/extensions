import { ActionPanel, List, Action, Icon, Image, showToast, Toast, confirmAlert } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { createPrusaClientFromPreferences } from "./api/prusaClient";
import { PrusaApiError } from "./api/errors";
import type { FileInfo } from "./api/types";

const DEFAULT_STORAGE = "usb"; // Changed from "local" to "usb" to match printer config

interface SortOption {
  key: keyof Pick<FileInfo, "name" | "m_timestamp">;
  label: string;
}

const sortOptions: SortOption[] = [
  { key: "name", label: "Name" },
  { key: "m_timestamp", label: "Date" },
];

function getFileIcon(file: FileInfo): Image.ImageLike {
  if (file.type === "FOLDER") {
    return Icon.Folder;
  }

  // Use the icon from the API if available
  if (file.refs?.icon) {
    return { source: file.refs.icon };
  }

  // Default to document icon
  return Icon.Document;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0]);

  const fetchFiles = useCallback(async () => {
    try {
      const client = createPrusaClientFromPreferences();

      const fileList = await client.listFiles(DEFAULT_STORAGE, "/");

      if (fileList && Array.isArray(fileList.children)) {
        setFiles(fileList.children);
      } else {
        setFiles([]);
      }
      setError(null);
    } catch (e) {
      let message = "An unexpected error occurred";

      if (e instanceof PrusaApiError) {
        if (e.statusCode === 403) {
          message = "Access denied. Please check your API key in preferences.";
        } else {
          message = e.message;
        }
      } else if (e instanceof Error) {
        message = e.message;
      }

      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const sortedFiles = [...(files || [])].sort((a, b) => {
    switch (sortBy.key) {
      case "m_timestamp":
        return b.m_timestamp - a.m_timestamp;
      case "name":
      default:
        return a.display_name.localeCompare(b.display_name);
    }
  });

  async function handleStartPrint(file: FileInfo) {
    try {
      const shouldStart = await confirmAlert({
        title: "Start Print",
        message: `Start printing ${file.display_name}?\n\nMake sure the printer is ready and the print bed is clear.`,
        primaryAction: {
          title: "Start Print",
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!shouldStart) return;

      setIsLoading(true);
      const client = createPrusaClientFromPreferences();
      await client.startPrint(DEFAULT_STORAGE, file.name);
      await showToast({
        style: Toast.Style.Success,
        title: "Print Started",
        message: file.display_name,
      });
    } catch (e) {
      const message = e instanceof PrusaApiError ? e.message : "Failed to start print";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    }
  }

  async function handleDeleteFile(file: FileInfo) {
    try {
      const shouldDelete = await confirmAlert({
        title: "Delete File",
        message: `Are you sure you want to delete ${file.display_name}?\n\nThis action cannot be undone.`,
        primaryAction: {
          title: "Delete",
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!shouldDelete) return;

      setIsLoading(true);
      const client = createPrusaClientFromPreferences();
      await client.deleteFile(DEFAULT_STORAGE, file.name);
      await showToast({
        style: Toast.Style.Success,
        title: "File Deleted",
        message: file.display_name,
      });

      // Refresh the file list
      fetchFiles();
    } catch (e) {
      const message = e instanceof PrusaApiError ? e.message : "Failed to delete file";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search print files..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          storeValue={true}
          onChange={(newValue) => {
            const option = sortOptions.find((opt) => opt.key === newValue);
            if (option) setSortBy(option);
          }}
        >
          <List.Dropdown.Section title="Sort By">
            {sortOptions.map((option) => (
              <List.Dropdown.Item key={option.key} title={option.label} value={option.key} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  // Open Raycast preferences
                }}
              />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={fetchFiles}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Print Files" subtitle={`${files.length} files`}>
          {sortedFiles.map((file) => (
            <List.Item
              key={file.name}
              icon={getFileIcon(file)}
              title={file.display_name}
              accessories={[{ date: new Date(file.m_timestamp * 1000) }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Start Print" icon={Icon.Play} onAction={() => handleStartPrint(file)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Download File"
                      url={file.refs.download || ""}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    <Action
                      title="Delete File"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteFile(file)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={fetchFiles}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
