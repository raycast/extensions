import { ActionPanel, Detail } from "@raycast/api";
import { TorrentItemData, TorrentItemDataExtended } from "../schema";
import { readTorrentDetails } from "../utils";
import { TorrentActions } from ".";
import { useEffect, useState } from "react";
import { useTorrents } from "../hooks";

interface TorrentViewProps {
  torrentItem: TorrentItemData;
  revalidate: () => void;
}

export const TorrentView: React.FC<TorrentViewProps> = ({ torrentItem, revalidate }) => {
  const { getTorrentDetails } = useTorrents();
  const [torrentDataSource, setTorrentDataSource] = useState<TorrentItemData | TorrentItemDataExtended>(torrentItem);

  const updateTorrentDetails = async () => {
    const extendedTorrentData = (await getTorrentDetails(torrentItem.id)) as TorrentItemDataExtended;
    setTorrentDataSource(extendedTorrentData);
  };

  useEffect(() => {
    updateTorrentDetails();
  }, []);

  return (
    <Detail
      markdown={readTorrentDetails(torrentDataSource)}
      actions={
        <ActionPanel>
          <TorrentActions torrentItem={torrentDataSource} revalidate={revalidate} popOnSuccess />
        </ActionPanel>
      }
    />
  );
};

export default TorrentView;
