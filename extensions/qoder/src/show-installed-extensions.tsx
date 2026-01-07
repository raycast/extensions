import { ActionPanel, Action, List, Icon, showToast, Toast, open, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  publisher: string;
  enabled: boolean;
}

export default function Command() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInstalledExtensions();
  }, []);

  async function loadInstalledExtensions() {
    try {
      const extensionsPath = join(homedir(), ".qoder", "extensions");

      const extensionDirs = await readdir(extensionsPath, { withFileTypes: true });
      const extensionList: Extension[] = [];

      for (const dir of extensionDirs) {
        if (!dir.isDirectory()) continue;

        try {
          const packageJsonPath = join(extensionsPath, dir.name, "package.json");
          const packageData = await readFile(packageJsonPath, "utf-8");
          const packageJson = JSON.parse(packageData);

          extensionList.push({
            id: dir.name,
            name: packageJson.displayName || packageJson.name || dir.name,
            version: packageJson.version || "Unknown",
            description: packageJson.description || "No description",
            publisher: packageJson.publisher || "Unknown",
            enabled: true, // Default to enabled, could check settings if needed
          });
        } catch {
          // If package.json can't be read, add basic info
          extensionList.push({
            id: dir.name,
            name: dir.name,
            version: "Unknown",
            description: "Extension information not available",
            publisher: "Unknown",
            enabled: true,
          });
        }
      }

      // Sort by name
      extensionList.sort((a, b) => a.name.localeCompare(b.name));
      setExtensions(extensionList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load extensions",
        message: error instanceof Error ? error.message : "Please make sure Qoder is installed",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function openExtensionFolder(extensionId: string) {
    try {
      const extensionsPath = join(homedir(), ".qoder", "extensions", extensionId);

      await closeMainWindow();
      await open(extensionsPath);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open extension folder",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed extensions...">
      {extensions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Extensions Found"
          description="No extensions are currently installed in Qoder"
        />
      ) : (
        extensions.map((extension) => (
          <List.Item
            key={extension.id}
            title={extension.name}
            subtitle={`v${extension.version} • ${extension.publisher}`}
            accessories={[
              {
                text: extension.enabled ? "Enabled" : "Disabled",
                icon: extension.enabled ? Icon.CheckCircle : Icon.XMarkCircle,
              },
            ]}
            icon={Icon.Box}
            actions={
              <ActionPanel>
                <Action
                  title="Open Extension Folder"
                  onAction={() => openExtensionFolder(extension.id)}
                  icon={Icon.Folder}
                />
                <Action.CopyToClipboard title="Copy Extension ID" content={extension.id} />
                <Action.CopyToClipboard title="Copy Extension Name" content={extension.name} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={extension.name} />
                    <List.Item.Detail.Metadata.Label title="ID" text={extension.id} />
                    <List.Item.Detail.Metadata.Label title="Version" text={extension.version} />
                    <List.Item.Detail.Metadata.Label title="Publisher" text={extension.publisher} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Description" text={extension.description} />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={extension.enabled ? "Enabled" : "Disabled"}
                      icon={extension.enabled ? Icon.CheckCircle : Icon.XMarkCircle}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
