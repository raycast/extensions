import { Tool } from "@raycast/api";
import type { ChannelStatus } from "../api/types";
import { getAuthenticatedArena } from "./arenaAuth";
import { channelSummary } from "./summarize";

type Input = {
  /**
   * Title for the new channel.
   */
  title: string;
  /**
   * Visibility: public (open to everyone), closed (listed but not open), or private.
   */
  visibility: ChannelStatus;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Create Are.na channel "${input.title}" with visibility "${input.visibility}"?`,
    info: [
      { name: "Title", value: input.title },
      { name: "Visibility", value: input.visibility },
    ],
  };
};

/**
 * Create a new channel on the signed-in Are.na account. Raycast asks for confirmation before running.
 */
export default async function tool(input: Input) {
  try {
    const title = input.title?.trim();
    if (!title) {
      return { error: "Channel title is required." };
    }

    const arena = await getAuthenticatedArena();
    const channel = await arena.channel().create(title, input.visibility);
    return { channel: channelSummary(channel) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
