import { ActionPanel, Action, List, Icon, showToast, Toast, open, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { join } from "path";
import { getLocalExtensions, Extension } from "./lib/qoder";

export default function Command() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInstalledExtensions();
  }, []);

  async function loadInstalledExtensions() {
    try {
      const extensionList = await getLocalExtensions();

      if (extensionList) {
        extensionList.sort((a, b) => a.name.localeCompare(b.name));
        setExtensions(extensionList);
      } else {
        setExtensions([]);
      }
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
            subtitle={`v${extension.version}${extension.publisherDisplayName ? ` • ${extension.publisherDisplayName}` : ""}`}
            accessories={[
              ...(extension.preRelease ? [{ tag: { value: "Pre-release", color: "#FFA500" } }] : []),
              ...(extension.preview ? [{ tag: { value: "Preview", color: "#00BFFF" } }] : []),
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
                    {extension.publisherDisplayName && (
                      <List.Item.Detail.Metadata.Label title="Publisher" text={extension.publisherDisplayName} />
                    )}
                    {extension.preRelease && (
                      <List.Item.Detail.Metadata.TagList title="Release Type">
                        <List.Item.Detail.Metadata.TagList.Item text="Pre-release" color="#FFA500" />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {extension.preview && (
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item text="Preview" color="#00BFFF" />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {extension.installedTimestamp && (
                      <List.Item.Detail.Metadata.Label
                        title="Installed"
                        text={new Date(extension.installedTimestamp).toLocaleString()}
                      />
                    )}
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
