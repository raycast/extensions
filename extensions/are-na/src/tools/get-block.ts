import { getAuthenticatedArena } from "./arenaAuth";
import { blockDetail } from "./summarize";

type Input = {
  /**
   * Numeric Are.na block id (string of digits).
   */
  blockId: string;
};

/**
 * Fetch one Are.na block by id (text content preview, source link, author, public URL).
 */
export default async function tool(input: Input) {
  try {
    const arena = await getAuthenticatedArena();
    const id = input.blockId.trim();
    if (!/^\d+$/.test(id)) {
      return { error: "blockId must be a numeric id." };
    }
    const block = await arena.block(Number(id)).get();
    return { block: blockDetail(block) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
