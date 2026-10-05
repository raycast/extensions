import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ReactElement } from "react";
import { getAssetFiles, AssetFiles } from "./api/polyhaven";
import { useDownload } from "./hooks/useDownload";

interface DownloadViewProps {
  assetId: string;
  assetName: string;
  onDownload?: (path: string) => void;
}

export default function DownloadView({ assetId, assetName, onDownload }: DownloadViewProps) {
  const { data: files, isLoading } = usePromise(getAssetFiles, [assetId]);
  const { downloadFile } = useDownload();

  const handleDownload = async (url: string, format: string, resolution: string) => {
    const fileName = `${assetName}_${resolution}.${format}`;
    await downloadFile(url, fileName, onDownload);
  };

  const getResolutionItems = (files: AssetFiles) => {
    if (!files.hdri) return [];

    const items: ReactElement[] = [];

    // Sort resolutions: 1k, 2k, 4k, 8k, 16k, etc.
    const sortedResolutions = Object.keys(files.hdri).sort((a, b) => {
      const valA = parseInt(a);
      const valB = parseInt(b);
      return valA - valB;
    });

    for (const res of sortedResolutions) {
      const formats = files.hdri[res];
      if (!formats) continue;

      for (const [fmt, info] of Object.entries(formats)) {
        items.push(
          <List.Item
            key={`${res}-${fmt}`}
            title={`${res} ${fmt.toUpperCase()}`}
            subtitle={(info.size / 1024 / 1024).toFixed(2) + " MB"}
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action title="Download" onAction={() => handleDownload(info.url, fmt, res)} />
                <Action.CopyToClipboard content={info.url} title="Copy URL" />
              </ActionPanel>
            }
          />,
        );
      }
    }
    return items;
  };

  const items = files ? getResolutionItems(files) : [];

  return (
    <List isLoading={isLoading} navigationTitle={`Download ${assetName}`}>
      {items.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Download}
          title="No Download Options"
          description="No HDRI files available for this asset."
        />
      )}
      {items}
    </List>
  );
}
