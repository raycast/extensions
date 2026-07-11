import { AssetResponseDto, getAssetInfo, updateAsset } from "@immich/sdk";
import { Action, ActionPanel, Detail, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { initialize, getAssetThumbnail, getAssetOriginal, getAssetWebUrl } from "../immich";
import { downloadAndCopyImage, downloadImageToDownloads } from "../utils/download";

export default function AssetView({ asset }: { asset: AssetResponseDto }) {
  const { data: info } = useCachedPromise(
    async (id) => {
      initialize();
      const res = await getAssetInfo({ id });
      return res;
    },
    [asset.id],
  );

  const toggleFavorite = async (asset: AssetResponseDto) => {
    const toast = await showToast(Toast.Style.Animated, "Toggling Favorite", asset.originalFileName);
    try {
      await updateAsset({ id: asset.id, updateAssetDto: { isFavorite: !asset.isFavorite } });
      toast.style = Toast.Style.Success;
      toast.title = "Favorite Toggled";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle favorite";
      toast.message = `${error}`;
    }
  };

  const copyImage = async () => {
    await downloadAndCopyImage(getAssetOriginal(asset.id), asset.originalFileName);
  };

  const downloadImage = async () => {
    await downloadImageToDownloads(getAssetOriginal(asset.id), asset.originalFileName);
  };

  const downloadKeyboardShortcut: Keyboard.Shortcut = {
    Windows: { modifiers: ["ctrl"], key: "s" },
    macOS: { modifiers: ["cmd"], key: "s" },
  };

  return (
    <Detail
      markdown={`![](${getAssetThumbnail(asset.id)}) \n---\n ${info?.exifInfo?.description || ""}`}
      metadata={
        info && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Description" text={info.exifInfo?.description || ""} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Details" />
            <Detail.Metadata.Label icon={Icon.Image} title="" text={asset.originalFileName} />
            <Detail.Metadata.TagList title="Tags">
              {asset.tags?.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {asset.isFavorite ? (
            <Action icon={Icon.HeartDisabled} title="Unfavorite" onAction={() => toggleFavorite(asset)} />
          ) : (
            <Action icon={Icon.Heart} title="Favorite" onAction={() => toggleFavorite(asset)} />
          )}
          <Action.OpenInBrowser
            title="Open in Immich"
            url={getAssetWebUrl(asset.id)}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action
            title="Copy to Clipboard"
            icon={Icon.CopyClipboard}
            onAction={copyImage}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Save to Downloads"
            icon={Icon.Download}
            onAction={downloadImage}
            shortcut={downloadKeyboardShortcut}
          />
        </ActionPanel>
      }
    />
  );
}
