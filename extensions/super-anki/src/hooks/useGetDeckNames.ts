import { useState, useEffect, useCallback } from "react";
import {
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import got from "got";
import { ExtensionPreferences } from "../types/extension-preferences";
import { Response } from "../types/response";

export function useGetDeckNames() {
  const [deckNames, setDeckNames] = useState<string[]>([]);
  const [selectedDeckName, setSelectedDeckName] = useState<string | undefined>(
    undefined,
  );
  const [isDeckNamesFetched, setIsDeckNamesFetched] = useState(false);
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const fetchDeckNames = useCallback(
    async (retryCount = 3) => {
      let attempt = 0;
      while (attempt < retryCount) {
        try {
          const { body }: { body: Response } = await got.post({
            url: preferences.server_url,
            json: {
              action: "deckNames",
              version: 6,
            },
            responseType: "json",
          });

          if (!body) {
            throw new Error("Failed to fetch deck names");
          }
          const data = body.result as unknown as string[];
          console.log("Deck names:", data);
          setDeckNames(data);

          const storedDeckName =
            await LocalStorage.getItem<string>("selectedDeckName");
          if (storedDeckName && data.includes(storedDeckName)) {
            setSelectedDeckName(storedDeckName);
          } else if (data.length > 0) {
            setSelectedDeckName(data[0]);
          }

          setIsDeckNamesFetched(true);
          showToast({
            style: Toast.Style.Success,
            title: "Connection established! Happy Learning 🎉",
          });
          return;
        } catch (error) {
          attempt++;
          console.error(
            `Attempt ${attempt}: Error fetching deck names:`,
            error,
          );

          if (attempt >= retryCount) {
            showToast({
              style: Toast.Style.Failure,
              title:
                "Connection not established: Please check connection String",
            });
            break;
          }
        }
      }
    },
    [preferences.server_url],
  );

  useEffect(() => {
    fetchDeckNames();
  }, [fetchDeckNames]);

  useEffect(() => {
    if (selectedDeckName) {
      LocalStorage.setItem("selectedDeckName", selectedDeckName);
    }
  }, [selectedDeckName]);

  return {
    deckNames,
    selectedDeckName,
    setSelectedDeckName,
    isDeckNamesFetched,
    refetch: fetchDeckNames,
  };
}
