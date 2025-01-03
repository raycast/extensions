import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import path from "path";
import { execSync } from "child_process";
import { uninstallApplication } from "../utils/uninstall";
import { FileListProps } from "../types";
import { escapeShellPath, formatBytes, formatError, log } from "../utils/helpers";

export default function FileList({
  selectedApp,
  allFiles,
  loadApplications,
  totalSize,
  setCurrentView,
  setSelectedApp,
  setRelatedFiles,
}: FileListProps) {
  return (
    <List navigationTitle={`Uninstall ${selectedApp?.name}`}>
      <List.Section title={`${allFiles.length} Files`} subtitle={formatBytes(parseInt(totalSize))}>
        {allFiles.map((file) => {
          const size = execSync(`du -sh ${escapeShellPath(file)} | cut -f1`)
            .toString()
            .trim();
          const fileName = path.basename(file);
          const filePath = path.dirname(file).replace(process.env.HOME || "", "~");
          const isApp = file.endsWith(".app");
          const isDirectory = file.endsWith("/") || !file.includes(".");

          return (
            <List.Item
              key={file}
              title={fileName}
              subtitle={filePath}
              icon={isApp ? { fileIcon: file } : isDirectory ? Icon.Folder : Icon.Document}
              accessories={[
                {
                  text: size,
                  tooltip: `Size: ${size}`,
                },
                {
                  icon: isDirectory ? Icon.Folder : Icon.Document,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Uninstall"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const options: Alert.Options = {
                        title: `Permanent Deletion Confirmation`,
                        message: `You are about to permanently delete ${allFiles.length} files and folders (${formatBytes(parseInt(totalSize))}). This includes:
                          
• The application itself
• All related support files
• Preferences and settings
• Cached data

This action cannot be undone. Are you sure you want to continue?`,
                        primaryAction: {
                          title: "Delete Permanently",
                          style: Alert.ActionStyle.Destructive,
                        },
                      };

                      if (await confirmAlert(options)) {
                        try {
                          await uninstallApplication(selectedApp!, allFiles, loadApplications);
                          setCurrentView("appList");
                          setSelectedApp(null);
                          setRelatedFiles([]);
                        } catch (error) {
                          log("Uninstall failed:", error);
                          await showToast({
                            style: Toast.Style.Failure,
                            title: `Failed to uninstall ${selectedApp?.name}`,
                            message: formatError(error),
                          });
                        }
                      }
                    }}
                  />
                  <Action
                    title="Back to App List"
                    icon={Icon.ArrowLeft}
                    onAction={() => {
                      setCurrentView("appList");
                      setSelectedApp(null);
                      setRelatedFiles([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
