import { LocalStorage } from "@raycast/api";
import { createHash } from "node:crypto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadType } from "../types";

const MAX_RECENT_DOWNLOADS = 8;

export interface RecentDownload {
  downloadId: number;
  type: DownloadType;
  fileId?: number;
}

const isRecentDownload = (value: unknown): value is RecentDownload => {
  if (!value || typeof value !== "object") return false;

  const recent = value as Partial<RecentDownload>;
  return (
    typeof recent.downloadId === "number" &&
    (recent.type === "torrent" || recent.type === "webdl" || recent.type === "usenet") &&
    (recent.fileId === undefined || typeof recent.fileId === "number")
  );
};

const getRecentKey = ({ downloadId, type, fileId }: RecentDownload) => `${type}-${downloadId}-${fileId ?? "folder"}`;

const mergeRecentDownloads = (...lists: RecentDownload[][]): RecentDownload[] => {
  const seenKeys = new Set<string>();

  return lists
    .flat()
    .filter((recent) => {
      const key = getRecentKey(recent);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    })
    .slice(0, MAX_RECENT_DOWNLOADS);
};

const getStorageKey = (apiKey: string) => {
  const accountHash = createHash("sha256").update(apiKey).digest("hex");
  return `recentDownloads-${accountHash}`;
};

export function useRecentDownloads(apiKey: string) {
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const recentDownloadsRef = useRef<RecentDownload[]>([]);
  const writeQueue = useRef(Promise.resolve());
  const storageKey = useMemo(() => getStorageKey(apiKey), [apiKey]);

  const saveRecentDownloads = useCallback((key: string, recents: RecentDownload[]) => {
    writeQueue.current = writeQueue.current
      .then(() => LocalStorage.setItem(key, JSON.stringify(recents)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let isCurrentAccount = true;
    recentDownloadsRef.current = [];
    setRecentDownloads([]);

    LocalStorage.getItem<string>(storageKey).then((storedRecents) => {
      if (!isCurrentAccount) return;

      let parsedRecents: RecentDownload[] = [];
      if (!storedRecents) return;

      try {
        const parsedValue: unknown = JSON.parse(storedRecents);
        parsedRecents = Array.isArray(parsedValue) ? parsedValue.filter(isRecentDownload) : [];
      } catch {
        // Ignore values written by an older or invalid version of the extension.
      }

      const mergedRecents = mergeRecentDownloads(recentDownloadsRef.current, parsedRecents);
      const hasNewRecents = recentDownloadsRef.current.length > 0;
      recentDownloadsRef.current = mergedRecents;
      setRecentDownloads(mergedRecents);

      if (hasNewRecents) {
        saveRecentDownloads(storageKey, mergedRecents);
      }
    });

    return () => {
      isCurrentAccount = false;
    };
  }, [saveRecentDownloads, storageKey]);

  const recordRecent = useCallback(
    (recent: RecentDownload) => {
      const nextRecents = mergeRecentDownloads([recent], recentDownloadsRef.current);
      recentDownloadsRef.current = nextRecents;
      setRecentDownloads(nextRecents);
      saveRecentDownloads(storageKey, nextRecents);
    },
    [saveRecentDownloads, storageKey],
  );

  return { recentDownloads, recordRecent };
}
