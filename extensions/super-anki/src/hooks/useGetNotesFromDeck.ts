import { useState, useEffect, useCallback } from "react";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import got from "got";
import { ExtensionPreferences } from "../types/extension-preferences";
import { NoteIdsResponse } from "../types/response/note-ids";

export function useFetchNoteIds(selectedDeckName: string) {
  const [noteIds, setNoteIds] = useState<number[]>([]);
  const [isNoteIdsFetched, setIsNoteIdsFetched] = useState(false);
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const fetchNoteIds = useCallback(
    async (retryCount = 3, retryDelay = 1000) => {
      let attempt = 0;
      while (attempt < retryCount) {
        try {
          console.log(
            `Attempt ${attempt + 1}: Fetching note IDs for deck: ${selectedDeckName}`,
          );

          const { body: findNotesBody }: { body: NoteIdsResponse } =
            await got.post({
              url: preferences.server_url,
              json: {
                action: "findNotes",
                version: 6,
                params: {
                  query: `deck:${selectedDeckName}`,
                },
              },
              responseType: "json",
              timeout: 5000, // Set timeout for the request
            });

          if (!findNotesBody || findNotesBody.error) {
            throw new Error(findNotesBody?.error || "Failed to fetch note IDs");
          }

          const notesIds = findNotesBody.result;
          console.log(`Found note IDs: ${notesIds}`);

          setNoteIds(notesIds);
          setIsNoteIdsFetched(true);
          return; // Exit the function successfully
        } catch (error) {
          attempt++;
          console.error(`Attempt ${attempt}: Error fetching note IDs:`, error);

          if (attempt >= retryCount) {
            showToast({
              style: Toast.Style.Failure,
              title:
                "Connection not established: Please check connection String",
            });
            break; // Exit the loop after max retries
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Delay before retrying
        }
      }
    },
    [preferences.server_url, selectedDeckName],
  );

  useEffect(() => {
    fetchNoteIds();
  }, [fetchNoteIds]);

  return { noteIds, isNoteIdsFetched, refetchNoteIds: fetchNoteIds };
}
