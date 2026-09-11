import { Tool } from "@raycast/api";
import { createObjectNote, getObject } from "../api";
import { ObjectSummary, describeObject, runWrite, summarizeObject } from "./shared";

type Input = {
  /**
   * The id of the object to add a note to. Get this from the search-mymind tool.
   */
  id: string;
  /**
   * The Markdown body of the note to attach.
   */
  note: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Add a note to this item?",
    info: [
      { name: "Item", value: await describeObject(input.id) },
      { name: "Note", value: input.note?.trim() },
    ],
  };
};

/**
 * Attach a Markdown note to an existing mymind object. Requires a full-access
 * key.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const note = input.note?.trim();

  if (!note) {
    throw new Error("A note body is required.");
  }

  return await runWrite(async () => {
    await createObjectNote(input.id, note);
    return summarizeObject(await getObject(input.id), { includeContent: true });
  });
}
