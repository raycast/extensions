import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { TORRENT_STATUS_MAP, formatFileSize } from "./utils";
import { TorrentActions, TorrentView } from "./components";
import { usePromise } from "@raycast/utils";
import { requestTorrents } from "./api";

export const Torrents = () => {
  const { data, isLoading, revalidate } = usePromise(requestTorrents);
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading}>
      {data &&
        data.map((torrent) => {
          return (
            <List.Item
              key={torrent.id}
              title={torrent?.filename}
              accessories={[
                { text: formatFileSize(torrent?.bytes) },
                {
                  icon: {
                    source: TORRENT_STATUS_MAP[torrent.status].icon,
                    tintColor: TORRENT_STATUS_MAP[torrent.status].color,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Info}
                      title="View More Details"
                      onAction={() => push(<TorrentView torrentItem={torrent} revalidate={revalidate} />)}
                    />
                  </ActionPanel.Section>
                  <TorrentActions torrentItem={torrent} revalidate={revalidate} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};

export default Torrents;
