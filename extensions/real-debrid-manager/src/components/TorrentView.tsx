import { ActionPanel, Color, Detail } from "@raycast/api";
import { TorrentItemData, TorrentItemDataExtended } from "../schema";
import { TORRENT_STATUS_MAP, formatDateTime, formatFileSize, readTorrentDetails } from "../utils";
import { TorrentActions } from ".";
import { useEffect, useState } from "react";
import { requestTorrentDetails } from "../api";

interface TorrentViewProps {
  torrentItem: TorrentItemData;
  revalidate: () => void;
}

export const TorrentView: React.FC<TorrentViewProps> = ({ torrentItem, revalidate }) => {
  const [torrentDataSource, setTorrentDataSource] = useState<TorrentItemData | TorrentItemDataExtended>(torrentItem);

  const updateTorrentDetails = async () => {
    const extendedTorrentData = await requestTorrentDetails(torrentItem.id);
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
      metadata={
        <Detail.Metadata>
          {torrentDataSource?.status && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={TORRENT_STATUS_MAP[torrentDataSource.status].title}
                color={TORRENT_STATUS_MAP[torrentDataSource.status].color}
              />
              {torrentDataSource.progress && torrentDataSource.progress !== 100 && (
                <Detail.Metadata.TagList.Item text={`${torrentDataSource.progress}%`} color={Color.Blue} />
              )}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Metadata">
            {torrentDataSource?.bytes && (
              <Detail.Metadata.TagList.Item text={formatFileSize(torrentDataSource.bytes)} />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />

          {torrentDataSource?.added && (
            <Detail.Metadata.Label title="Date Added" text={formatDateTime(torrentDataSource.added, "date")} />
          )}
        </Detail.Metadata>
      }
    />
  );
};

export default TorrentView;
