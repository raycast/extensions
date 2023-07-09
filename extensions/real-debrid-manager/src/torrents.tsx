import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useTorrents } from "./hooks";
import { formatFileSize } from "./utils";
import { TorrentActions, TorrentView } from "./components";

export const Torrents = () => {
  const { getTorrents } = useTorrents();
  const { data, isLoading, revalidate } = getTorrents();
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading}>
      {data &&
        data.map((torrent) => {
          return (
            <List.Item
              key={torrent.id}
              title={torrent?.filename}
              accessories={[{ text: formatFileSize(torrent?.bytes) }]}
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
