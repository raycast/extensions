import { open, showToast, Toast } from "@raycast/api";
import { buildAppUrl } from "./config";
import type { Note } from "./types";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

export default async function DailyNote() {
  const today = new Date();
  const title = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  try {
    showToast({
      style: Toast.Style.Animated,
      title: "Opening Daily Note",
    });

    const results = await remoApi.searchNotes(title);

    const existingNote = results.find((n: Note) => n.title.toLowerCase() === title.toLowerCase());

    let noteId = existingNote?._id;

    if (!noteId) {
      // Create new note
      noteId = await remoApi.createNote({
        title: title,
        content: `# ${title}\n\n`,
        source: "raycast",
        tags: ["daily"],
      });
    }

    await open(buildAppUrl(`/notes/${noteId}`));
  } catch (error) {
    handleError(error, "Failed to open daily note");
  }
}
