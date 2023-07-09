import { Action, ActionPanel, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { TorrentItemData, TorrentItemDataExtended } from "../schema";
import { useTorrents, useUnrestrict } from "../hooks";
import TorrentFileSelection from "./TorrentFileSelection";
import { isTorrentCompleted, isTorrentPendingFileSelection } from "../utils";

type TorrentActionsProp = {
  torrentItem: TorrentItemData;
  revalidate: () => void;
  popOnSuccess?: boolean;
};

export const TorrentActions: React.FC<TorrentActionsProp> = ({ torrentItem, revalidate, popOnSuccess }) => {
  const { pop, push } = useNavigation();
  const { deleteTorrent, getTorrentDetails } = useTorrents();
  const { unRestrictLinks } = useUnrestrict();

  const handleTorrentItemSelect = async (torrentItem: TorrentItemData) => {
    const links = torrentItem?.links ?? [];
    await showToast({
      style: Toast.Style.Animated,
      title: "Sending to Downloads",
    });
    const results = await unRestrictLinks(links, "link");
    const hadErrors = results.find(({ status }) => status === "rejected") as {
      status: string;
      reason?: string;
    };
    if (hadErrors) {
      await showToast({
        style: Toast.Style.Failure,
        title: hadErrors?.reason ?? "Something went wrong",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Sent to Downloads",
      });
    }
  };

  const handleTorrentDelete = async ({ id }: TorrentItemData) => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting torrent...",
    });
    try {
      await deleteTorrent(id);
      revalidate();

      await showToast({
        style: Toast.Style.Success,
        title: "Torrent deleted",
      });
      popOnSuccess && pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete torrent",
      });
    }
  };

  const handleFileSelectionRequest = async (id: string) => {
    try {
      const torrentDetails = (await getTorrentDetails(id)) as TorrentItemDataExtended;
      push(<TorrentFileSelection torrentItemData={torrentDetails} revalidate={revalidate} />);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to Select Files");
    }
  };

  return (
    <ActionPanel.Section>
      {isTorrentPendingFileSelection(torrentItem.status) && (
        <Action
          title="Select Files"
          icon={Icon.List}
          shortcut={{
            key: "f",
            modifiers: ["opt", "ctrl"],
          }}
          onAction={() => handleFileSelectionRequest(torrentItem.id)}
        />
      )}
      {isTorrentCompleted(torrentItem.status) && (
        <Action
          title="Send to Downloads"
          shortcut={{
            key: "d",
            modifiers: ["ctrl", "opt"],
          }}
          icon={Icon.Download}
          onAction={() => handleTorrentItemSelect(torrentItem)}
        />
      )}
      <Action
        shortcut={{
          key: "backspace",
          modifiers: ["cmd"],
        }}
        icon={Icon.Trash}
        title="Delete Torrent"
        onAction={() => handleTorrentDelete(torrentItem)}
      />
    </ActionPanel.Section>
  );
};

export default TorrentActions;
