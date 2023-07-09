import { Action, ActionPanel, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { TorrentItemData } from "../schema";
import { useTorrents, useUnrestrict } from "../hooks";

type TorrentActionsProp = {
  torrentItem: TorrentItemData;
  revalidate: () => void;
};

export const TorrentActions: React.FC<TorrentActionsProp> = ({ torrentItem, revalidate }) => {
  const { pop } = useNavigation();
  const { deleteTorrent } = useTorrents();
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
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete torrent",
      });
    }
  };

  return (
    <ActionPanel.Section>
      <Action icon={Icon.Forward} title="Send to Downloads" onAction={() => handleTorrentItemSelect(torrentItem)} />
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
