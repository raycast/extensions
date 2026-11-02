import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { contentUrl, DATASET_URL, downloadCommand, fileUrl, folderUrl, formatBytes } from "../lib/assets";
import type { Asset, AssetDetails } from "../lib/assets";

function DownloadGuide({ asset, details }: { asset: Asset; details?: AssetDetails }) {
  const command = downloadCommand(asset.id);
  return (
    <Detail
      navigationTitle="Download Asset Folder"
      markdown={`# Download ${asset.title}

From [SimReady Assets](${DATASET_URL}) by NVIDIA.

Download this asset's folder, including its models, textures, payloads, and license. USD models can reference other files in this folder, so keep its folder structure intact.

${details ? `**Folder size:** ${formatBytes(details.totalSize)} across ${details.files.length} files.\n` : ""}
Install the [Hugging Face CLI](https://huggingface.co/docs/huggingface_hub/en/guides/cli#getting-started), then copy and run this command in ${process.platform === "win32" ? "PowerShell" : "your terminal"}:

\`\`\`sh
${command}
\`\`\`

Files are saved to \`./simready-assets/${asset.id}/\` in your current directory. Only this asset folder is included. You can change \`--local-dir\` to choose another destination.

For individual files, use **Browse Asset Files** and choose **Download File in Browser**.`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Download Command" content={command} />
          <Action.OpenInBrowser title="Open Asset on Hugging Face" url={folderUrl(asset.id)} />
          <Action.OpenInBrowser
            title="Open CLI Installation Guide"
            url="https://huggingface.co/docs/huggingface_hub/en/guides/cli#getting-started"
          />
        </ActionPanel>
      }
    />
  );
}

export function AssetActions({
  asset,
  details,
  copyShortcut = true,
}: {
  asset: Asset;
  details?: AssetDetails;
  copyShortcut?: boolean;
}) {
  return (
    <>
      <Action.OpenInBrowser
        title="Open Asset on Hugging Face"
        url={folderUrl(asset.id)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      {details?.models[0] && (
        <Action.OpenInBrowser title="Preview 3D Model on Hugging Face" url={fileUrl(details.models[0].path)} />
      )}
      <Action.Push
        title="Download Asset Folder…"
        icon={Icon.Download}
        target={<DownloadGuide asset={asset} details={details} />}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
      />
      <Action.CopyToClipboard
        title="Copy Asset URL"
        content={folderUrl(asset.id)}
        shortcut={copyShortcut ? Keyboard.Shortcut.Common.Copy : undefined}
      />
      <Action.CopyToClipboard title="Copy Asset Name" content={asset.id} />
      {details?.preview && (
        <Action.OpenInBrowser title="Open Preview Image" url={contentUrl(details.preview.path)} icon={Icon.Image} />
      )}
      {details?.licensePath && <Action.OpenInBrowser title="View Asset License" url={fileUrl(details.licensePath)} />}
    </>
  );
}

export function CatalogActions({ refresh }: { refresh: () => void }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh Catalog"
        icon={Icon.ArrowClockwise}
        onAction={refresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action.OpenInBrowser title="Open NVIDIA's SimReady Assets" url={DATASET_URL} />
    </ActionPanel.Section>
  );
}
