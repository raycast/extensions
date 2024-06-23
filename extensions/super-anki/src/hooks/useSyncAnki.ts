import { useEffect, useCallback } from "react";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import got from "got";
import { ExtensionPreferences } from "../types/extension-preferences";
import { Response } from "../types/response";

export function useSyncAnki() {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const fetchSyncAnki = useCallback(
    async (retryCount = 3) => {
      let attempt = 0;
      while (attempt < retryCount) {
        try {
          const { body }: { body: Response } = await got.post({
            url: preferences.server_url,
            json: {
              action: "sync",
              version: 6,
            },
            responseType: "json",
          });

          if (!body) {
            throw new Error("Failed to fetch deck names");
          }

          showToast({
            style: Toast.Style.Success,
            title: "Sync successful 🎉",
          });
          return;
        } catch (error) {
          attempt++;
          console.error(`Attempt ${attempt}: Error fetching deck names:`, error);

          if (attempt >= retryCount) {
            showToast({
              style: Toast.Style.Failure,
              title: "Connection not established: Please check connection String",
            });
            break;
          }
        }
      }
    },
    [preferences.server_url],
  );

  useEffect(() => {
    fetchSyncAnki();
  }, [fetchSyncAnki]);

  return { fetchSyncAnki };
}


