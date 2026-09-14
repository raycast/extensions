import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference } from "../utils/references";
import { blockDetail } from "./summarize";
import { Tool } from "@raycast/api";
type Input = {
  /** Block ID or Are.na block URL. */
  blockId: string;
  /** New title; omit to keep it. */
  title?: string;
  /** New text/Markdown, for Text blocks only. */
  content?: string;
  /** New description; empty string clears it. */
  description?: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Update Are.na block ${input.blockId}?`,
  info: [
    { name: "Title", value: input.title ?? "Unchanged" },
    { name: "Content", value: input.content ?? "Unchanged" },
    { name: "Description", value: input.description ?? "Unchanged" },
  ],
});
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.blockId, "block");
    if (input.title === undefined && input.content === undefined && input.description === undefined)
      throw new Error("Provide at least one field to update.");
    const arena = await getAuthenticatedArena();
    return {
      block: blockDetail(
        await arena.block(id).update({ title: input.title, content: input.content, description: input.description }),
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
