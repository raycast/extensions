import { Action, ActionPanel, Icon, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";
import { DownloadItemData } from "../schema";
import { isExternalHost } from "../utils";
import { useStreaming } from "../hooks";
import { requestDownloadDelete } from "../api";

type DownloadActionsProp = {
  downloadItem: DownloadItemData;
  revalidate: () => void;
  popOnSuccess?: boolean;
};

export const DownloadActions: React.FC<DownloadActionsProp> = ({ downloadItem, revalidate, popOnSuccess }) => {
  const { pop } = useNavigation();

  const { supportedMediaPlayers, playWithMediaPlayer, isDownloadItemPlayable } = useStreaming();

  const handleDownloadDelete = async ({ id }: DownloadItemData) => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting download...",
    });
    try {
      await requestDownloadDelete(id);
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
      {isDownloadItemPlayable(downloadItem) && (
        <ActionPanel.Section>
          <ActionPanel.Submenu title="Stream">
            {supportedMediaPlayers.map((player) => (
              <Action
                shortcut={{
                  key: player.key as Keyboard.KeyEquivalent,
                  modifiers: ["opt", "ctrl"],
                }}
                key={player.key}
                icon={Icon.Play}
                title={`Stream in ${player.name}`}
                onAction={() => playWithMediaPlayer(downloadItem.download, player)}
              />
            ))}
            <Action.OpenInBrowser
              shortcut={{
                key: "'",
                modifiers: ["opt", "ctrl"],
              }}
              title="Stream in Browser"
              url={`https://real-debrid.com/streaming-${downloadItem?.id}`}
            />
          </ActionPanel.Submenu>
        </ActionPanel.Section>
      )}
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
