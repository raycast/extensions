import { Color, Icon } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { type Torrent, TorrentStatus } from "../types";
import { capitalize } from "./string";

export const statusToLabel = (status: TorrentStatus, percentDone: number) => {
  switch (status) {
    case TorrentStatus.Stopped:
      return percentDone === 1 ? "Completed" : "Stopped";
    case TorrentStatus.QueuedToCheckFiles:
      return "Queued to check files";
    case TorrentStatus.CheckingFiles:
      return "Checking files";
    case TorrentStatus.QueuedToDownload:
      return "Queued to download";
    case TorrentStatus.Downloading:
      return "Downloading";
    case TorrentStatus.QueuedToSeed:
      return "Queued to seed";
    case TorrentStatus.Seeding:
      return "Seeding";
  }
};

export const statusIconSource = (torrent: Torrent): string => {
  if (torrent.errorString) return Icon.ExclamationMark;

  switch (torrent.status) {
    case TorrentStatus.Stopped:
      return torrent.percentDone === 1 ? Icon.Checkmark : "status-stopped.png";
    case TorrentStatus.QueuedToCheckFiles:
    case TorrentStatus.CheckingFiles:
    case TorrentStatus.QueuedToDownload:
      return Icon.Dot;
    case TorrentStatus.Downloading: {
      if (torrent.metadataPercentComplete < 1) return "status-loading.png";
      switch (Math.round(torrent.percentDone * 10)) {
        case 0:
          return "status-progress-0.png";
        case 1:
          return "status-progress-1.png";
        case 2:
          return "status-progress-2.png";
        case 3:
          return "status-progress-3.png";
        case 4:
          return "status-progress-4.png";
        case 5:
          return "status-progress-5.png";
        case 6:
          return "status-progress-6.png";
        case 7:
          return "status-progress-7.png";
        case 8:
          return "status-progress-8.png";
        case 9:
          return "status-progress-9.png";
        case 10:
        default:
          return "status-progress-10.png";
      }
    }
    case TorrentStatus.QueuedToSeed:
    case TorrentStatus.Seeding:
      return Icon.ChevronUp;
    default:
      return Icon.XmarkCircle;
  }
};

export const formatEta = (eta: number): string => {
  switch (eta) {
    case -1:
      return "Unavailable";
    case -2:
      return "Unknown";
    default:
      return `${capitalize(formatDistanceToNow(new Date(Date.now() + eta * 1000)))} Left`;
  }
};

export const formatStatus = (torrent: Torrent): string => {
  return torrent.status === TorrentStatus.Downloading
    ? formatEta(torrent.eta)
    : statusToLabel(torrent.status, torrent.percentDone);
};

export const statusIconColor = (torrent: Torrent): string => {
  if (torrent.errorString) return Color.Red;

  switch (torrent.status) {
    case TorrentStatus.Downloading:
      return torrent.metadataPercentComplete < 1 ? Color.Red : Color.Green;
    default:
      return Color.SecondaryText;
  }
};

export const statusIcon = (torrent: Torrent): { source: string; tintColor: string } => ({
  source: statusIconSource(torrent),
  tintColor: statusIconColor(torrent),
});
