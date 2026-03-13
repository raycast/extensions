import { formatFileSize, isTorrentCompleted, isTorrentPendingFileSelection } from ".";
import {
  DownloadItemData,
  MediaData,
  TorrentItemData,
  TorrentItemDataExtended,
  TrafficData,
  TrafficReset,
  TrafficType,
  UserData,
} from "../schema";

export const readTrafficInfo = (trafficInfo?: TrafficData) => {
  if (!trafficInfo) return "";

  let markdownTable = `
# Traffic Information


| Domain | Remaining | Limit |
|--------|------|-------|
`;

  for (const domain in trafficInfo) {
    const info = trafficInfo[domain];
    const leftText = info.type === "links" ? `${info.left} Links` : formatFileSize(info.left);
    const limitText =
      info.limit && info.reset ? `${info.limit} ${TrafficType[info.type]} / ${TrafficReset[info.reset]}` : "-";

    markdownTable += `| ${domain === "remote" ? "Remote" : domain} | ${leftText} | ${limitText} |\n`;
  }

  return markdownTable;
};

export const readUserDetails = (userInfo: UserData, trafficInfo?: TrafficData) => {
  return `
## User: ${userInfo?.username}
    
![](${userInfo?.avatar})

${readTrafficInfo(trafficInfo)}
`;
};

const readTorrentFilesData = (details: TorrentItemDataExtended): string => {
  if (!details?.files?.length ?? null) return "";

  return details.files.reduce((acc, file) => {
    return acc + `- [${file.selected ? "x" : " "}] \`${file.path}\`  \`${formatFileSize(file.bytes)}\`\n`;
  }, `## Torrent Files \n`);
};

export const readTorrentDetails = (details: TorrentItemData | TorrentItemDataExtended) => {
  return `
# ${details?.filename}

${isTorrentCompleted(details.status) ? `💡 To download file(s), move torrent to downloads first.` : ""}

${
  isTorrentPendingFileSelection(details.status)
    ? `💡 Files must be selected and downloaded before moved to downloads`
    : ""
}

${readTorrentFilesData(details as TorrentItemDataExtended) || ``}
`;
};

export const readDownloadDetails = (details: DownloadItemData, youtubeThumbnailUrl?: string | null) => {
  return `
# ${details?.filename}

${
  youtubeThumbnailUrl
    ? `
![](${youtubeThumbnailUrl})
`
    : ""
}
`;
};

export const readStreamingDetails = (details: MediaData, downloadItem: DownloadItemData) => {
  return `
# ${details?.filename} ${details.year ? `(${details.year})` : ``}

${
  details.backdrop_path
    ? `
![](${details.backdrop_path})
`
    : ""
}

${downloadItem.filename}

💡 This metadata is fetched from Real-Debrid and may not be accurate.
`;
};
