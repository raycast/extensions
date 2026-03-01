import { TorrentFilters } from "@ctrl/qbittorrent";

export const filterStates: TorrentFilters[] = [
  "all",
  "active",
  "completed",
  "downloading",
  "inactive",
  "paused",
  "stalled",
  "stalled_downloading",
  "stalled_uploading",
];
