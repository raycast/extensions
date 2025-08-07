import { useEffect, useState } from "react";
import { cacheLog, getLargeCacheDirectory, useCache } from "./cache";
import { gitlab } from "./common";
import { daysInSeconds, hashString } from "./utils";
import path from "path/posix";
import * as fs from "fs/promises";
import { Image } from "@raycast/api";

export enum GitLabIcons {
  merge_request = "mropen.png",
  todo = "todo-done.svg",
  review = "review-list.svg",
  issue = "exclamation.png",
  project = "project.svg",
  merged = "merged.png",
  mropen = "mropen.png", // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
  mraccepted = "todo.png",
  branches = "merged.png", // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
  ci = "rocket.png",
  milestone = "board_circuit.png",
  explorer = "list.png",
  settings = "gear.png",
  security = "lock.png",
  labels = "dash.png",
  epic = "epic.svg",
  comment = "book.png",
  wiki = "list.png", // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
  show_details = "app-window-sidebar-right-16",
  tag = "tag.png",
  commit = "commit.svg",
  activity = "history.svg",
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
  defaultIcon?: string,
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
    { deps: [url], secondsToRefetch: 600, secondsToInvalid: daysInSeconds(7) },
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

export function getSVGText(text: string): string | undefined {
  if (!text || text.length <= 0) {
    return undefined;
  }
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#FA6E34" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${text}</text>
</svg>
  `.replaceAll("\n", "");

  return `data:image/svg+xml,${svg}`;
}

export function getTextIcon(text: string): Image.ImageLike | undefined {
  if (!text || text.length <= 0) {
    return undefined;
  }
  return getSVGText(text);
}
