import { ActionPanel, Detail } from "@raycast/api";
import { TorrentItemData } from "../schema";
import { readTorrentDetails } from "../utils";
import { TorrentActions } from ".";

interface TorrentViewProps {
  torrentItem: TorrentItemData;
  revalidate: () => void;
}

export const TorrentView: React.FC<TorrentViewProps> = ({ torrentItem, revalidate }) => {
  return (
    <Detail
      markdown={readTorrentDetails(torrentItem)}
      actions={
        <ActionPanel>
          <TorrentActions torrentItem={torrentItem} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
};

export default TorrentView;
