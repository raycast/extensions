import { useState, useEffect } from "react";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import got from "got";
import { ExtensionPreferences } from "../types/extension-preferences";
import { Response } from "../types/response";
import { NoteInfo } from "../types/note-info";

interface GotError extends Error {
  code?: string;
}

export function useFetchNotesInfo(noteIds: number[]) {
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const fetchNotesInfo = async (retryCount = 3) => {
    setIsFetching(true);
    let attempt = 0;
    while (attempt < retryCount) {
      try {
        if (noteIds.length === 0) {
          console.log("No note IDs provided");
          return;
        }

        console.log(`Fetching notes info for IDs: ${noteIds}`);

        const { body: notesInfoBody }: { body: Response } = await got.post({
          url: preferences.server_url,
          json: {
            action: "notesInfo",
            version: 6,
            params: {
              notes: noteIds,
            },
          },
          responseType: "json",
          timeout: { request: 5000 }, // Set timeout for the request
          retry: 0, // Disable got's internal retry mechanism
        });

        if (!notesInfoBody || notesInfoBody.error) {
          throw new Error(notesInfoBody?.error || "Failed to fetch notes info");
        }

        const data = notesInfoBody.result as unknown as NoteInfo[];
        console.log("Notes:", data);

        setNotes(data);
        setIsFetching(false);
        showToast({
          style: Toast.Style.Success,
          title: "Connection established! Happy Learning 🎉",
        });
        return;
      } catch (error) {
        attempt++;
        const err = error as GotError;

        if (err.code === "ECONNRESET") {
          if (attempt >= retryCount) {
            showToast({
              style: Toast.Style.Failure,
              title:
                "Connection not established: Please check connection String",
              message: err.message,
            });
          }
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Connection not established: Please check connection String",
            message: err.message,
          });
          break;
        }

        // Delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  };

  useEffect(() => {
    fetchNotesInfo();
  }, [noteIds]);

  return { notes, isFetching, refetchNotesInfo: fetchNotesInfo };
}
