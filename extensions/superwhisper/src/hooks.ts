import { open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isSuperwhisperInstalled } from "./utils";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { Mode } from "./select-mode";
import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

export function useModes() {
  const {
    data: modes,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      const { modeDir } = getPreferenceValues<Preferences.SelectMode>();
      const isInstalled = await isSuperwhisperInstalled();
      if (!isInstalled) {
        throw new Error("Superwhisper is not installed");
      }

      // Read mode json files from configured mode directory
      return readdirSync(modeDir)
        .filter((file) => file.indexOf(".json") !== -1)
        .map((file) => JSON.parse(readFileSync(`${modeDir}/${file}`, "utf8")) as Mode);
    },
    [],
    {
      failureToastOptions: {
        title: `Failed to fetch modes`,
        message: "Check if Superwhisper is installed and mode directory is correct.",
        primaryAction: {
          title: "Install from superwhisper.com",
          onAction: async (toast) => {
            await open("https://superwhisper.com");
            await toast.hide();
          },
        },
      },
    },
  );

  return { modes, isLoading: (!modes && !error) || isLoading, error };
}

export function useRecordings() {
  const {
    data: recordings,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      const isInstalled = await isSuperwhisperInstalled();
      if (!isInstalled) {
        throw new Error("Superwhisper is not installed");
      }

      const recordingsPath = join(homedir(), "Documents", "superwhisper", "recordings");

      if (!existsSync(recordingsPath)) {
        throw new Error("Recording directory not found. Please make a recording first.");
      }

      const directories = readdirSync(recordingsPath)
        .filter((dir) => /^\d+$/.test(dir))
        .map((dir) => ({
          dir,
          path: join(recordingsPath, dir),
        }));

      if (directories.length === 0) {
        throw new Error("No recordings found. Please make a recording first.");
      }

      const recordingsList = directories.map((directory) => {
        const metaPath = join(directory.path, "meta.json");
        const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
        const stats = statSync(metaPath);

        return {
          directory: directory.dir,
          meta,
          timestamp: stats.mtime,
        };
      });

      recordingsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return recordingsList;
    },
    [],
    {
      failureToastOptions: {
        title: `Failed to fetch recordings`,
        message: "Check if Superwhisper is installed and recordings directory is correct.",
        primaryAction: {
          title: "Install from superwhisper.com",
          onAction: async (toast) => {
            await open("https://superwhisper.com");
            await toast.hide();
          },
        },
      },
    },
  );

  return { recordings, isLoading: (!recordings && !error) || isLoading, error };
}
