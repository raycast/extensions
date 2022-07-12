import { useEffect, useState } from "react";
import { cacheLog, getLargeCacheDirectory, useCache } from "./cache";
import { gitlab } from "./common";
import { daysInSeconds, hashString } from "./utils";
import path from "path/posix";
import * as fs from "fs/promises";

export enum GitLabIcons {
  merge_request = "mropen.png",
  todo = "todo.png",
  review = "list-icon.png",
  issue = "exclamation.png",
  project = "main-list-view-16",
  merged = "merged.png",
  mropen = "mropen.png",
  mraccepted = "todo.png",
  branches = "merged.png",
  ci = "rocket.png",
  milestone = "board_circuit.png",
  explorer = "list.png",
  settings = "gear.png",
  security = "lock.png",
  labels = "dash.png",
  epic = "epic.png",
  comment = "book.png",
  wiki = "list.png",
  show_details = "sidebar-right-16",
  tag = "tag.png",
  commit = "commit.png",
  status_success = "status_success.png",
  status_failed = "status_failed.png",
  status_running = "status_running.png",
  status_notfound = "status_notfound.png",
  status_pending = "status_pending.png",
  status_created = "status_created.png",
  status_canceled = "status_canceled.png",
  status_skipped = "status_skipped.png",
  status_scheduled = "status_scheduled.png",
}

async function getImageCacheDirectory(ensureDirectory = false): Promise<string> {
  const cacheDir = getLargeCacheDirectory();
  const imgDir = path.join(cacheDir, "img");
  if (ensureDirectory) {
    cacheLog(`create img cache directoy '${imgDir}'`);
    await fs.mkdir(imgDir, { recursive: true });
  }
  return imgDir;
}

export function useImage(
  url?: string,
  defaultIcon?: string
): {
  localFilepath?: string;
  error?: string;
  isLoading: boolean;
} {
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data } = useCache<string | undefined>(
    "img_" + hashString(url || ""),
    async (): Promise<string | undefined> => {
      if (!url) {
        return undefined;
      }
      const imgDir = await getImageCacheDirectory(true);
      const imgFilepath = path.join(imgDir, hashString(url)) + ".png"; // TODO get the extension correctly
      return await gitlab.downloadFile(url, { localFilepath: imgFilepath });
    },
    { deps: [url], secondsToRefetch: 600, secondsToInvalid: daysInSeconds(7) }
  );

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      if (!didUnmount) {
        if (!data) {
          setLocalFilepath(defaultIcon);
        } else {
          setLocalFilepath(data);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [data]);

  return { localFilepath, error, isLoading };
}
