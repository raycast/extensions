import type { Movie } from "./movie";

export type QueueItem = {
  id: number;
  movieId: number;
  movie: Movie;
  size: number;
  title: string;
  sizeleft: number;
  status: string;
  trackedDownloadStatus: "ok" | "warning" | "error";
  trackedDownloadState:
    | "downloading"
    | "downloadFailed"
    | "downloadFailedPending"
    | "importPending"
    | "importing"
    | "imported"
    | "failedPending"
    | "failed"
    | "ignored";
  statusMessages: Array<{
    title: string;
    messages: string[];
  }>;
  downloadId: string;
  protocol: "unknown" | "usenet" | "torrent";
  downloadClient: string;
  indexer: string;
  outputPath: string;
  timeleft?: string;
  estimatedCompletionTime?: string;
};
