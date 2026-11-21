import { Tool } from "@raycast/api";
import { noteTitle, noteUrl } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { describeError, resolveNote } from "./shared";

type Input = {
  /**
   * Markdown to add. Use "- [ ] text" lines for tasks; prefer add-task for a single task with dates or priority.
   */
  content: string;
  /**
   * Optional noteUUID from search-notes. Takes precedence over noteName.
   */
  noteUUID?: string;
  /**
   * Optional exact note name. Omit both noteUUID and noteName to use today's Daily Jot.
   */
  noteName?: string;
  /**
   * Where to add the content. Defaults to "end".
   */
  position?: "start" | "end";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  info: [
    {
      name: "Note",
      value: input.noteName?.trim() || (input.noteUUID ? "Selected note" : "Today's Daily Jot"),
    },
    { name: "Position", value: input.position === "start" ? "Start" : "End" },
    { name: "Content", value: input.content.slice(0, 300) },
  ],
});

/**
 * Add Markdown content to an Amplenote note, by default to the end of today's Daily Jot.
 */
export default async function (input: Input) {
  try {
    if (!input.content.trim()) throw new Error("The content is empty.");
    const note = await resolveNote(input);
    await amplenote.insertNoteContent(note.uuid, input.content, input.position !== "start");
    return {
      noteUUID: note.uuid,
      noteName: noteTitle(note),
      position: input.position ?? "end",
      url: noteUrl(note.uuid),
    };
  } catch (error) {
    describeError(error);
  }
}
