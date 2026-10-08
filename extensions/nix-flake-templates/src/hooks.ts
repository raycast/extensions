import { environment, LocalStorage, showToast, Toast } from "@raycast/api";
import fetch, { FetchError } from "node-fetch";
import fs from "node:fs/promises";
import path from "node:path";
import fsSync from "node:fs";
import { pipeline } from "node:stream/promises";
import { useEffect, useState, useCallback, useRef } from "react";
import { spawn } from "./utils";
import { FlakeTemplate, State } from "./types";

const ZIP_URL = "https://codeload.github.com/the-nix-way/dev-templates/zip/main";
const ZIP_PATH = path.resolve(environment.supportPath, "download.zip");
const EXTRACTED_PATH = path.resolve(environment.supportPath, "dev-templates-main");
const LATEST_PATH = path.resolve(environment.supportPath, "latest");
const CACHE_TIMEOUT = 1000 * 60 * 60 * 24;

class UpdateError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, UpdateError.prototype);
  }
}

async function fetchTemplates(): Promise<void> {
  const response = await fetch(ZIP_URL);
  if (!response.ok) {
    throw new UpdateError(`Failed to download: ${response.statusText}.`);
  }
  if (response.body === null) {
    throw new UpdateError("No data returned. Please, try again later.");
  }

  await fs.rm(ZIP_PATH, { force: true });
  await pipeline(response.body, fsSync.createWriteStream(ZIP_PATH));

  try {
    await fs.rm(EXTRACTED_PATH, { recursive: true, force: true });
    await spawn("tar", ["-xf", ZIP_PATH, "--directory", environment.supportPath]);
  } catch (error) {
    throw new UpdateError("Could not unzip. Please file a bug report.");
  }

  await fs.rm(LATEST_PATH, { recursive: true, force: true });
  await fs.rm(ZIP_PATH);
  await fs.rename(EXTRACTED_PATH, LATEST_PATH);
}

async function loadFlakeTemplates(dir: string): Promise<FlakeTemplate[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const templates = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory() && !dirent.name.startsWith(".")) {
        const flakePath = path.join(res, "flake.nix");
        try {
          const content = await fs.readFile(flakePath, "utf-8");
          return [{ lang: dirent.name, content }];
        } catch (error) {
          console.warn(`No flake.nix found in ${dirent.name}`);
          return [];
        }
      }
      return [];
    }),
  );
  return templates.flat();
}

async function isExpired(): Promise<boolean> {
  const lastUpdated = (await LocalStorage.getItem("last-updated")) as number;
  if (!lastUpdated) return true;
  return Date.now() - lastUpdated > CACHE_TIMEOUT;
}

export function useFlakeTemplates(): [state: State, refresh: () => void] {
  const [state, setState] = useState<State>({ flakeTemplates: [], isLoading: true });
  const refreshInProgress = useRef(false);

  const refresh = useCallback(
    async (shouldDownload: boolean = false) => {
      if (refreshInProgress.current) {
        return;
      }

      refreshInProgress.current = true;
      setState((s) => ({
        ...s,
        isLoading: true,
      }));

      if (!shouldDownload) {
        try {
          await fs.access(LATEST_PATH);
        } catch (error) {
          shouldDownload = true;
        }
      }

      try {
        if (shouldDownload || (await isExpired())) {
          await fetchTemplates();
          showToast({ title: "Successfully downloaded flake templates" });
          await LocalStorage.setItem("last-updated", new Date().getTime());
        }

        const flakeTemplates = await loadFlakeTemplates(LATEST_PATH);
        setState((s) => ({
          ...s,
          flakeTemplates,
          isLoading: false,
        }));
      } catch (error) {
        let message = "Unknown error occured";
        if (error instanceof FetchError) {
          message = "Please check your internet connection and try again";
        } else if (error instanceof Error) {
          message = error.message;
        }
        console.log(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to refresh",
          message,
        });
        setState((s) => ({
          ...s,
          isLoading: false,
        }));
      } finally {
        refreshInProgress.current = false;
      }
    },
    [setState],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return [state, () => refresh(true)];
}
