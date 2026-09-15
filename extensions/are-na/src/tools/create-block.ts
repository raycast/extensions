import { getAuthenticatedArena } from "./arenaAuth";
import { channelReferences } from "../utils/references";
import { blockDetail } from "./summarize";
import { Tool } from "@raycast/api";
type Input = {
  /** Text/Markdown or a URL to save. URLs are processed into the appropriate block type. */
  content: string;
  /** One to twenty destination channel IDs, slugs, or Are.na channel URLs. */
  channelIds: string[];
  /** Optional title. */
  title?: string;
  /** Optional Markdown description. */
  description?: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create a block and save it to these channels?",
  info: [
    { name: "Channels", value: input.channelIds.join(", ") },
    { name: "Content", value: input.content },
    { name: "Title", value: input.title ?? "Automatic" },
    { name: "Description", value: input.description ?? "None" },
  ],
});
export default async function tool(input: Input) {
  try {
    const channelIds = channelReferences(input.channelIds);
    if (!input.content.trim()) throw new Error("Content is required.");
    const arena = await getAuthenticatedArena();
    const block = await arena.createBlock({ ...input, channelIds });
    return { block: blockDetail(block), channel_ids: channelIds };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
