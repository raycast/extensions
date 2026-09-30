import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference } from "../utils/references";
import { channelSummary } from "./summarize";
import { Tool } from "@raycast/api";
type Input = {
  /** Channel ID, slug, or Are.na channel URL. */
  identifier: string;
  /** New title; omit to keep it. */
  title?: string;
  /** Public is open, closed is visible but restricted, private is unlisted. */
  visibility?: "public" | "closed" | "private";
  /** New description; empty string clears it. */
  description?: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Update Are.na channel ${input.identifier}?`,
  info: [
    { name: "Title", value: input.title ?? "Unchanged" },
    { name: "Visibility", value: input.visibility ?? "Unchanged" },
    { name: "Description", value: input.description ?? "Unchanged" },
  ],
});
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.identifier, "channel");
    if (input.title !== undefined && !input.title.trim()) throw new Error("Channel title cannot be blank.");
    if (input.title === undefined && input.visibility === undefined && input.description === undefined)
      throw new Error("Provide at least one field to update.");
    const arena = await getAuthenticatedArena();
    return {
      channel: channelSummary(
        await arena
          .channel(id)
          .update({ title: input.title, status: input.visibility, description: input.description }),
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
