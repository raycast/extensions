import { Action, ActionPanel, Icon, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";
import { DownloadFileData } from "../schema";
import { isExternalHost } from "../utils";
import { useDownloads, useMediaPlayer } from "../hooks";

type DownloadActionsProp = {
  downloadItem: DownloadFileData;
  revalidate: () => void;
  popOnSuccess?: boolean;
};

export const DownloadActions: React.FC<DownloadActionsProp> = ({ downloadItem, revalidate, popOnSuccess }) => {
  const { pop } = useNavigation();

  const { supportedMediaPlayers, playWithMediaPlayer, isDownloadItemPlayable } = useMediaPlayer();
  const { deleteDownload } = useDownloads();

  const handleDownloadDelete = async ({ id }: DownloadFileData) => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting download...",
    });
    try {
      await deleteDownload(id);
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "Download deleted",
      });
      popOnSuccess && pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete download",
      });
    }
  };
  return (
    <>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={downloadItem?.download} />
        <Action.CopyToClipboard
          content={downloadItem?.download}
          title="Copy Download Link"
          shortcut={{
            key: "c",
            modifiers: ["cmd"],
          }}
        />
        {isExternalHost(downloadItem) && (
          <Action.CopyToClipboard
            content={downloadItem?.link}
            title="Copy Original Link"
            shortcut={{
              key: ".",
              modifiers: ["cmd"],
            }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {isDownloadItemPlayable(downloadItem) &&
          supportedMediaPlayers.map((player) => (
            <Action
              shortcut={{
                key: player.key as Keyboard.KeyEquivalent,
                modifiers: ["opt", "ctrl"],
              }}
              key={player.key}
              icon={Icon.Play}
              title={`Play with ${player.name}`}
              onAction={() => playWithMediaPlayer(downloadItem.download, player)}
            />
          ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          shortcut={{
            key: "backspace",
            modifiers: ["cmd"],
          }}
          icon={Icon.Trash}
          title="Delete Download"
          onAction={() => handleDownloadDelete(downloadItem)}
        />
      </ActionPanel.Section>
    </>
  );
};

export default DownloadActions;
