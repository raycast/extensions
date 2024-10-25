import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { environment } from "@raycast/api";
import { PromptStore } from "./store";
import React, { useState, useEffect } from "react";
import { BackupListProps } from "./types";

export default function BackupList({ loadPrompts }: BackupListProps): React.ReactElement {
  const [backups, setBackups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wrap in an async function since useEffect can't be async
    async function fetchBackups() {
      try {
        const backupPath = path.join(environment.supportPath, 'backups');
        const files = await readdir(backupPath);
        const jsonFiles = files
          .filter(file => file.endsWith('.json'))
          .sort()
          .reverse();
        setBackups(jsonFiles);
      } catch (error) {
        console.error("Failed to load backups:", error);
        setBackups([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchBackups();
  }, []);

  const formatBackupDate = (filename: string) => {
    try {
      const datePart = filename.replace('promptbase-backup-', '').replace('.json', '');
      return datePart;
    } catch {
      return filename;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search backups...">
      {backups.length > 0 ? (
        backups.map((backup) => (
          <List.Item
            key={backup}
            title={formatBackupDate(backup)}
            subtitle={`Backup file: ${backup}`}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Restore This Backup"
                    onAction={async () => {
                      try {
                        const backupPath = path.join(environment.supportPath, 'backups');
                        const filePath = path.join(backupPath, backup);
                        const fileContent = await readFile(filePath, 'utf-8');
                        const success = await PromptStore.importPrompts(fileContent);
                        
                        if (success) {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Backup Restored",
                            message: `Restored from ${backup}`
                          });
                        } else {
                          throw new Error("Invalid backup file");
                        }
                      } catch (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Restore Failed",
                          message: "Could not restore backup"
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView 
          title="No Backups Found"
          description="Create a backup first to see it here"
        />
      )}
    </List>
  );
}