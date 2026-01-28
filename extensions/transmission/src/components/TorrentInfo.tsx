import { Detail } from "@raycast/api";
import prettyBytes from "pretty-bytes";
import { formatDate } from "../utils/date";
import { Torrent } from "../types";
import useRemaining from "@/hooks/useRemaining";

export default function TorrentInfo({ torrent }: { torrent: Torrent }) {
  const remaining = useRemaining(torrent);
  return (
    <>
      <Detail.Metadata.Label title="Remaining time" text={remaining} />
      <Detail.Metadata.Label title="Pieces" text={`${torrent.pieceCount} / ${prettyBytes(torrent.pieceSize)}`} />
      <Detail.Metadata.Label title="Hash" text={torrent.hashString} />
      <Detail.Metadata.Label title="Private" text={torrent.isPrivate ? "Yes" : "No"} />
      {torrent.creator && <Detail.Metadata.Label title="Creator" text={torrent.creator} />}
      {torrent.dateCreated > 0 && <Detail.Metadata.Label title="Created On" text={formatDate(torrent.dateCreated)} />}
      <Detail.Metadata.Label title="Directory" text={torrent.downloadDir} />
      {torrent.comment && <Detail.Metadata.Label title="Comment" text={torrent.comment} />}
    </>
  );
}
