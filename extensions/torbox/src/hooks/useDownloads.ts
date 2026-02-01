import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Download, DownloadType } from "../types";
import { TorrentData, WebDownloadData, UsenetData, QueuedDownloadData } from "../api/types";
import { fetchTorrents, fetchWebDownloads, fetchUsenetDownloads, fetchQueuedDownloads } from "../api/downloads";

const toDownload = (data: TorrentData | WebDownloadData | UsenetData, type: DownloadType): Download => ({
  id: data.id,
  name: data.name,
  size: data.size ?? 0,
  type,
  created_at: data.created_at,
  progress: data.progress ?? 0,
  download_finished: data.download_finished ?? false,
  isQueued: false,
  files: data.files ?? [],
});

const toQueuedDownload = (data: QueuedDownloadData): Download => ({
  id: data.id,
  name: data.name,
  size: 0,
  type: data.type,
  created_at: data.created_at,
  progress: 0,
  download_finished: false,
  isQueued: true,
  files: [],
});

const fetchAllDownloads = async (apiKey: string): Promise<Download[]> => {
  const [torrents, webDownloads, usenetDownloads, queued] = await Promise.all([
    fetchTorrents(apiKey),
    fetchWebDownloads(apiKey),
    fetchUsenetDownloads(apiKey),
    fetchQueuedDownloads(apiKey),
  ]);

  const allDownloads: Download[] = [
    ...torrents.map((t) => toDownload(t, "torrent")),
    ...webDownloads.map((w) => toDownload(w, "webdl")),
    ...usenetDownloads.map((u) => toDownload(u, "usenet")),
    ...queued.map(toQueuedDownload),
  ];

  allDownloads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allDownloads;
};

export const useDownloads = () => {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();

  return useCachedPromise(fetchAllDownloads, [apiKey], {
    keepPreviousData: true,
  });
};
