import { fetch } from "undici";
import { getAPIURL } from "./get-preferences";

export interface ListGroupsResult {
  version: string;
  result: Result[];
}

export interface Result {
  FirstID: number;
  LastID: number;
  RemainingSizeLo: number;
  RemainingSizeHi: number;
  RemainingSizeMB: number;
  PausedSizeLo: number;
  PausedSizeHi: number;
  PausedSizeMB: number;
  RemainingFileCount: number;
  RemainingParCount: number;
  MinPriority: number;
  MaxPriority: number;
  ActiveDownloads: number;
  Status: string;
  NZBID: number;
  NZBName: string;
  NZBNicename: string;
  Kind: string;
  URL: string;
  NZBFilename: string;
  DestDir: string;
  FinalDir: string;
  Category: string;
  ParStatus: string;
  ExParStatus: string;
  UnpackStatus: string;
  MoveStatus: string;
  ScriptStatus: string;
  DeleteStatus: string;
  MarkStatus: string;
  UrlStatus: string;
  FileSizeLo: number;
  FileSizeHi: number;
  FileSizeMB: number;
  FileCount: number;
  MinPostTime: number;
  MaxPostTime: number;
  TotalArticles: number;
  SuccessArticles: number;
  FailedArticles: number;
  Health: number;
  CriticalHealth: number;
  DupeKey: string;
  DupeScore: number;
  DupeMode: string;
  Deleted: boolean;
  DownloadedSizeLo: number;
  DownloadedSizeHi: number;
  DownloadedSizeMB: number;
  DownloadTimeSec: number;
  PostTotalTimeSec: number;
  ParTimeSec: number;
  RepairTimeSec: number;
  UnpackTimeSec: number;
  MessageCount: number;
  ExtraParBlocks: number;
  Parameters: Parameter[];
  ScriptStatuses: unknown[];
  ServerStats: unknown[];
  PostInfoText: string;
  PostStageProgress: number;
  PostStageTimeSec: number;
  Log: unknown[];
}

export interface Parameter {
  Name: string;
  Value: string;
}

export async function pauseDownload(nzbId: number) {
  const res = await fetch(getAPIURL("/jsonrpc/pause"), {
    method: "POST",
    body: JSON.stringify({
      method: "editqueue",
      params: ["GroupPause", "", [nzbId]],
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to pause download: ${res.statusText}`);
  }

  return res.json();
}

export async function resumeDownload(nzbId: number) {
  const res = await fetch(getAPIURL("/jsonrpc/resume"), {
    method: "POST",
    body: JSON.stringify({
      method: "editqueue",
      params: ["GroupResume", "", [nzbId]],
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to resume download: ${res.statusText}`);
  }

  return res.json();
}

export async function cancelDownload(nzbId: number) {
  const res = await fetch(getAPIURL("/jsonrpc/cancel"), {
    method: "POST",
    body: JSON.stringify({
      method: "editqueue",
      params: ["GroupDelete", "", [nzbId]],
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to cancel download: ${res.statusText}`);
  }

  return res.json();
}
