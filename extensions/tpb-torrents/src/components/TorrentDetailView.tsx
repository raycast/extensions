import { ActionPanel, Detail, Action, Icon, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { BaseTorrent } from "../types/torrent.types";
import { API_ENDPOINTS } from "../constants/api.constants";
import { formatFileSize, formatDate, generateMagnetLink, hasTextContent } from "../utils/torrent.utils";
import { useTorrentDetail } from "../hooks/useTorrentDetail";

interface TorrentDetailViewProps {
  torrent: BaseTorrent;
}

export const TorrentDetailView = ({ torrent }: TorrentDetailViewProps) => {
  const { torrentDetail, isLoading, error } = useTorrentDetail(torrent.id);

  const magnetLink = useMemo(
    () => generateMagnetLink(torrent.info_hash, torrent.name),
    [torrent.info_hash, torrent.name],
  );

  const actions = useMemo(
    () => (
      <ActionPanel>
        <Action.OpenInBrowser title="Open Magnet Link" url={magnetLink} icon={Icon.MagnifyingGlass} />
        <Action.CopyToClipboard
          title="Copy Magnet Link"
          content={magnetLink}
          icon={Icon.Link}
          onCopy={() => showToast(Toast.Style.Success, "Magnet link copied!")}
        />
        <Action.CopyToClipboard
          title="Copy Info Hash"
          content={torrent.info_hash}
          icon={Icon.Hashtag}
          onCopy={() => showToast(Toast.Style.Success, "Info hash copied!")}
        />
        <Action.OpenInBrowser title="Open in Browser" url={API_ENDPOINTS.torrentPage(torrent.id)} icon={Icon.Globe} />
      </ActionPanel>
    ),
    [magnetLink, torrent.info_hash, torrent.id],
  );

  if (isLoading || !torrentDetail) {
    return (
      <Detail
        isLoading={true}
        markdown="# Loading...

Fetching torrent details from the server..."
        actions={actions}
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Unable to Load Details\n\n${error || "The torrent details couldn't be loaded at this time. This might be due to network issues or the torrent may no longer be available."}\n\nYou can still use the actions below to copy the magnet link or info hash.`}
        actions={actions}
      />
    );
  }

  const markdown = `
# ${torrentDetail.name}

${hasTextContent(torrentDetail.descr) ? `## Description\n${torrentDetail.descr}` : "## Description\nNo description available"}

## Info Hash
\`${torrentDetail.info_hash}\`
  `;

  const metadata = (
    <Detail.Metadata>
      {torrentDetail.size && parseInt(torrentDetail.size.toString()) > 0 && (
        <Detail.Metadata.Label title="Size" text={formatFileSize(parseInt(torrentDetail.size.toString()))} />
      )}
      <Detail.Metadata.Label title="Seeders" text={`${torrentDetail.seeders || "0"} 🟢`} />
      <Detail.Metadata.Label title="Leechers" text={`${torrentDetail.leechers || "0"} 🔴`} />
      {torrentDetail.num_files && parseInt(torrentDetail.num_files.toString()) > 0 && (
        <Detail.Metadata.Label title="Files" text={torrentDetail.num_files} />
      )}
      <Detail.Metadata.Separator />
      {hasTextContent(torrentDetail.username) && (
        <Detail.Metadata.Label title="Uploaded by" text={torrentDetail.username} />
      )}
      {torrentDetail.added && <Detail.Metadata.Label title="Added" text={formatDate(torrentDetail.added.toString())} />}
      {hasTextContent(torrentDetail.status) && torrentDetail.status !== "vip" && (
        <Detail.Metadata.Label title="Status" text={torrentDetail.status} />
      )}
      {hasTextContent(torrentDetail.category) && (
        <Detail.Metadata.Label title="Category" text={torrentDetail.category} />
      )}
      {hasTextContent(torrentDetail.language) && (
        <Detail.Metadata.Label title="Language" text={torrentDetail.language!} />
      )}
      {hasTextContent(torrentDetail.textlanguage) && (
        <Detail.Metadata.Label title="Text Language" text={torrentDetail.textlanguage!} />
      )}
      <Detail.Metadata.Label title="Info Hash" text={torrentDetail.info_hash} />
    </Detail.Metadata>
  );

  return <Detail markdown={markdown} actions={actions} metadata={metadata} />;
};
