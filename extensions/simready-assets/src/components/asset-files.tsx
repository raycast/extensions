import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { useAssetDetails } from "../hooks/use-asset-details";
import { contentUrl, fileGroup, fileUrl, formatBytes, normalizeSearch } from "../lib/assets";
import type { Asset } from "../lib/assets";
import { AssetActions } from "./asset-actions";

const GROUPS = ["Models", "Payloads", "Textures", "Source Files", "Previews", "Metadata"];

export function AssetFiles({ asset }: { asset: Asset }) {
  const { data, isLoading, error, revalidate } = useAssetDetails(asset.id);
  const [query, setQuery] = useState("");
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  const files = data?.files.filter((file) =>
    terms.every((term) => normalizeSearch(file.path.slice(asset.id.length + 1)).includes(term)),
  );
  const assetActions = (
    <ActionPanel>
      <AssetActions asset={asset} details={data} />
      <Action
        title="Refresh Files"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={asset.title}
      searchBarPlaceholder="Search this asset's files…"
      filtering={false}
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      actions={assetActions}
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Document}
        title={isLoading ? "Loading Asset Files…" : error ? "Could Not Load Files" : "No Files Found"}
        description={
          error
            ? error.message
            : query
              ? "Try a different filename."
              : "Open this asset on Hugging Face to inspect its contents."
        }
        actions={assetActions}
      />
      {data &&
        GROUPS.map((group) => {
          const groupFiles = files?.filter((file) => fileGroup(file, data) === group) ?? [];
          if (!groupFiles.length) return null;
          return (
            <List.Section
              key={group}
              title={group}
              subtitle={
                group === "Models"
                  ? "Use Download Asset Folder for models with their dependencies"
                  : `${groupFiles.length} files`
              }
            >
              {groupFiles.map((file) => {
                const relativePath = file.path.slice(asset.id.length + 1);
                const filename = relativePath.split("/").pop() ?? relativePath;
                return (
                  <List.Item
                    key={file.path}
                    id={file.path}
                    title={filename}
                    subtitle={relativePath.slice(0, -(filename.length + 1))}
                    icon={
                      group === "Models"
                        ? Icon.Box
                        : group === "Previews" || group === "Textures"
                          ? Icon.Image
                          : Icon.Document
                    }
                    accessories={[{ text: formatBytes(file.size), tooltip: `${file.size.toLocaleString()} bytes` }]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action.OpenInBrowser title="Open File on Hugging Face" url={fileUrl(file.path)} />
                          <Action.OpenInBrowser
                            title="Download File in Browser"
                            icon={Icon.Download}
                            url={contentUrl(file.path, true)}
                            shortcut={{
                              macOS: { modifiers: ["cmd"], key: "d" },
                              Windows: { modifiers: ["ctrl"], key: "d" },
                            }}
                          />
                          <Action.CopyToClipboard
                            title="Copy File URL"
                            content={fileUrl(file.path)}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                          />
                          <Action.CopyToClipboard title="Copy Download URL" content={contentUrl(file.path, true)} />
                          <Action.CopyToClipboard title="Copy File Path" content={file.path} />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Asset">
                          <AssetActions asset={asset} details={data} copyShortcut={false} />
                          <Action
                            title="Refresh Files"
                            icon={Icon.ArrowClockwise}
                            onAction={revalidate}
                            shortcut={Keyboard.Shortcut.Common.Refresh}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}
