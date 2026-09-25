import { arenaReference } from "../utils/references";
import { getAuthenticatedArena } from "./arenaAuth";
import { channelSummary } from "./summarize";

type Input = {
  /**
   * Channel ID, slug, or canonical Are.na channel URL.
   */
  identifier: string;
};

/**
 * Fetch metadata for a single Are.na channel (title, visibility, owner, block count, URL).
 */
export default async function tool(input: Input) {
  try {
    const arena = await getAuthenticatedArena();
    const channel = await arena.channel(arenaReference(input.identifier, "channel")).get();
    return { channel: channelSummary(channel) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
