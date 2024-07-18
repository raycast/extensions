import { open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isSuperwhisperInstalled } from "./utils";
import { readdirSync, readFileSync } from "fs";
import { Mode } from "./select-mode";
import { getPreferenceValues } from "@raycast/api";

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
