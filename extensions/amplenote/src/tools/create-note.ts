import { Tool } from "@raycast/api";
import { isTemporaryId, normalizeTag, noteUrl, TAG_PATTERN } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { isConnectionError } from "../lib/mcp";
import { describeError } from "./shared";

type Input = {
  /**
   * The note title.
   */
  name: string;
  /**
   * Optional tags. Lowercase letters, numbers, and dashes, with / for nested tags. Prefer existing tags from list-tags.
   */
  tags?: string[];
  /**
   * Optional note content in Markdown. Use "- [ ] text" lines for tasks.
   */
  content?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  info: [
    { name: "Title", value: input.name.trim() },
    ...(input.tags?.length ? [{ name: "Tags", value: input.tags.join(", ") }] : []),
    ...(input.content?.trim() ? [{ name: "Content", value: input.content.slice(0, 300) }] : []),
  ],
});

/**
 * Create a new Amplenote note with optional tags and Markdown content.
 * Returns the permanent noteUUID once Amplenote has saved the note; temporary is true if that took too long.
 */
export default async function (input: Input) {
  try {
    const name = input.name.trim();
    if (!name) throw new Error("The note title is empty.");
    const tags = (input.tags ?? []).map(normalizeTag);
    const invalid = tags.find((tag) => !TAG_PATTERN.test(tag));
    if (invalid) throw new Error(`"${invalid}" is not a valid tag. Use lowercase letters, numbers, dashes, and /.`);
    const createdUUID = await amplenote.createNote(name, tags);
    // The note exists from here on. Report a failed content step instead of throwing, so a retry doesn't
    // create a duplicate; append-to-note with the returned noteUUID can add the content later.
    let contentError: string | undefined;
    if (input.content?.trim()) {
      await amplenote.insertNoteContent(createdUUID, input.content).catch((error) => {
        // Never throw here, not even when Amplenote stops responding: the caller needs the id to avoid a duplicate.
        contentError = isConnectionError(error)
          ? "The note was created, but Amplenote stopped responding before its content was added. Use append-to-note with this noteUUID to retry."
          : "The note was created, but its content could not be added. Use append-to-note with this noteUUID to retry.";
      });
    }
    // Callers often keep the id, so wait briefly for the permanent one instead of returning the temporary id.
    const noteUUID = await amplenote.waitForPermanentId(createdUUID);
    return {
      noteUUID,
      temporary: isTemporaryId(noteUUID),
      name,
      tags,
      url: noteUrl(noteUUID),
      ...(contentError ? { contentError } : {}),
    };
  } catch (error) {
    describeError(error);
  }
}
