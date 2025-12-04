import { getPreferenceValues, Tool } from "@raycast/api";
import open from "open";
import { loadDatabase } from "../bear-db";

type Input = {
  /**
   * The title of the note. If there is no title, set as empty string.
   */
  title: string;

  /**
   * The content of the note.
   */
  text: string;

  /**
   * List of tags to assign to note. If there are multiple tags, join them using comma.
   */
  tags?: string;
};

export default async function (input: Input) {
  await loadDatabase(); // We load the DB to ensure Bear DB is present

  const { newNoteOpenMode, prependTimeAndDate, pinNote } = getPreferenceValues<Preferences.NewNote>();
  await open(
    `bear://x-callback-url/create?title=${input.title}&tags=${input.tags}&open_note=${
      newNoteOpenMode !== "no" ? "yes" : "no"
    }&new_window=${newNoteOpenMode === "new" ? "yes" : "no"}&show_window=${
      newNoteOpenMode !== "no" ? "yes" : "no"
    }&edit=${newNoteOpenMode === "no" ? "no" : "yes"}&timestamp=${prependTimeAndDate ? "yes" : "no"}&text=${
      input.text
    }&pin=${pinNote ? "yes" : "no"}`,
    { background: newNoteOpenMode === "no" },
  );
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "Title", value: input.title },
      { name: "Text", value: input.text },
      { name: "Tags", value: input.tags ?? "" },
    ],
  };
};
