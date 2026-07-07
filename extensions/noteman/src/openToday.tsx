import { Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { NoteDetailView } from "./components/NoteDetailView";
import { getNotesDirectory } from "./lib/config";
import { createDailyIfMissing } from "./lib/notes";

export default function OpenTodayCommand() {
  const [todayPath, setTodayPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function openTodayNote() {
      try {
        const notesDir = getNotesDirectory();
        const notePath = await createDailyIfMissing(notesDir);
        setTodayPath(notePath);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setErrorMessage(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open today's note",
          message,
        });
      }
    }

    openTodayNote();
  }, []);

  if (errorMessage) {
    return (
      <Detail markdown={`# Unable to open today's note\n\n${errorMessage}`} />
    );
  }

  if (!todayPath) {
    return <Detail isLoading markdown="Preparing today's note..." />;
  }

  return <NoteDetailView notePath={todayPath} />;
}
