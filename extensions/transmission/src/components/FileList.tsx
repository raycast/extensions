import { Detail } from "@raycast/api";
import prettyBytes from "pretty-bytes";
import { Torrent } from "../types";
import { getMaxFilesShown } from "../utils/preferences";

export default function FileList({ torrent }: { torrent: Torrent }) {
  const files = torrent.files.slice(0, getMaxFilesShown());
  const total = torrent.files.length;
  return (
    <>
      {files.map((file, key) => (
        <Detail.Metadata.Label
          text={file.name}
          title={`${((100 / file.length) * file.bytesCompleted).toFixed(2)}% - ${prettyBytes(file.length)}`}
          key={key}
        />
      ))}
      {total > getMaxFilesShown() && <Detail.Metadata.Label title={`and ${total - getMaxFilesShown()} more`} />}
    </>
  );
}
