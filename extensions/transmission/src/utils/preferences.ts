import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  /** Host - The hostname of the Transmission server */
  host: string;
  /** Port - The port of the Transmission server */
  port: string;
  /** SSL - Use SSL to connect to the Transmission server */
  ssl: boolean;
  /** Username - The username to use for authentication */
  username: string;
  /** Password - The password to use for authentication */
  password: string;
  /** Sort By - The field to sort the torrent list by */
  sortBy: "progress" | "name" | "status" | "addedDate";
  /** Sort Direction - The direction to sort the torrent list */
  sortDirection: "asc" | "desc";
  /** Quick Paths - Comma-separated list of paths where you often download your torrents (must be full-paths or tidle-prefixed ones) */
  quickPaths: string;
  /** Status Filter - Remember the status filter when opening the list */
  rememberStatusFilter: boolean;
  /** Show files before torrent info - Show torrent files before torrent information in the torrent details panel */
  showFilesAboveTorrentInfo: boolean;
  /** Max Files Shown - The maximum number of files to show in the torrent details panel */
  maxFilesShown: string;
};

export const preferences = getPreferenceValues<Preferences>();

export const getMaxFilesShown = () => {
  const parsed = parseInt(preferences.maxFilesShown, 10);
  const maxFilesShown = isNaN(parsed) ? 20 : parsed;
  if (maxFilesShown < 0) {
    return 0;
  }
  if (maxFilesShown > 100) {
    return 100;
  }
  return maxFilesShown;
};
