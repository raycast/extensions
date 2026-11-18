import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { statSync } from "fs";
import { basename } from "path";
import React from "react";

interface FileListProps {
  files: string[];
  onRemove: (filePath: string) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  const getFileIcon = (filePath: string): Icon => {
    try {
      const stats = statSync(filePath);
      return stats.isDirectory() ? Icon.Folder : Icon.Document;
    } catch {
      return Icon.Document;
    }
  };

  const getFileSize = (filePath: string): string => {
    try {
      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        return "Directory";
      }
      const bytes = stats.size;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } catch {
      return "Unknown";
    }
  };

  return (
    <List>
      {files.map((filePath) => (
        <List.Item
          key={filePath}
          title={basename(filePath)}
          subtitle={getFileSize(filePath)}
          icon={getFileIcon(filePath)}
          accessories={[{ text: filePath }]}
          actions={
            <ActionPanel>
              <Action
                title="Remove"
                icon={Icon.Trash}
                onAction={() => onRemove(filePath)}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
