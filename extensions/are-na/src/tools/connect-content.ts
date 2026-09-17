import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference, channelReferences } from "../utils/references";
import { Tool } from "@raycast/api";
type Input = {
  /** Existing block ID/URL or channel ID/slug/URL. */
  identifier: string;
  /** Whether the existing item is a Block or Channel. */
  type: "Block" | "Channel";
  /** One to twenty destination channel IDs, slugs, or URLs. */
  channelIds: string[];
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Connect ${input.type.toLowerCase()} ${input.identifier} to these channels?`,
  info: [{ name: "Channels", value: input.channelIds.join(", ") }],
});
export default async function tool(input: Input) {
  try {
    const ref = arenaReference(input.identifier, input.type === "Block" ? "block" : "channel");
    const channelIds = channelReferences(input.channelIds);
    const arena = await getAuthenticatedArena();
    const id = input.type === "Channel" ? (await arena.channel(ref).get()).id : Number(ref);
    await arena.connection().create({ connectable_id: id, connectable_type: input.type, channel_ids: channelIds });
    return { connected: true, id, type: input.type, channel_ids: channelIds };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
