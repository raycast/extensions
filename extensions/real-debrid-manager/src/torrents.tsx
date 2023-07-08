import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useTorrents, useUnrestrict } from "./hooks";
import { useState } from "react";
import { formatFileSize, readTorrentDetails } from "./utils";
import { TorrentItemData } from "./schema";

export const Torrents = () => {
  const { getTorrents, deleteTorrent } = useTorrents();
  const { unRestrictLinks } = useUnrestrict();
  const { data, isLoading, revalidate } = getTorrents();
  const [showingDetail, setShowingDetail] = useState(false);

  const handleTorrentItemSelect = async (torrent: TorrentItemData) => {
    const links = torrent?.links ?? [];
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
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete torrent",
      });
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {data &&
        data.map((torrent) => {
          const props: Partial<List.Item.Props> = showingDetail
            ? {
                detail: <List.Item.Detail markdown={readTorrentDetails(torrent)} />,
              }
            : {
                accessories: [{ text: formatFileSize(torrent?.bytes) }],
              };
          return (
            <List.Item
              key={torrent.id}
              title={torrent?.filename}
              {...props}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Forward}
                    title="Send to Downloads"
                    onAction={() => handleTorrentItemSelect(torrent)}
                  />
                  <Action
                    icon={Icon.Info}
                    title="Toggle More Details"
                    onAction={() => setShowingDetail(!showingDetail)}
                  />
                  <Action
                    shortcut={{
                      key: "backspace",
                      modifiers: ["cmd"],
                    }}
                    icon={Icon.Trash}
                    title="Delete Torrent"
                    onAction={() => handleTorrentDelete(torrent)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};

export default Torrents;
