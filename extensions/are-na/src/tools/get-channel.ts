import { getAuthenticatedArena } from "./arenaAuth";
import { channelSummary } from "./summarize";

type Input = {
  /**
   * Channel id (digits only) or slug as accepted by the Are.na API.
   */
  identifier: string;
};

function parseChannelRef(raw: string): string | number {
  const t = raw.trim();
  if (/^\d+$/.test(t)) return Number(t);
  return t;
}

/**
 * Fetch metadata for a single Are.na channel (title, visibility, owner, block count, URL).
 */
export default async function tool(input: Input) {
  try {
    const arena = await getAuthenticatedArena();
    const channel = await arena.channel(parseChannelRef(input.identifier)).get();
    return { channel: channelSummary(channel) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
