import { arenaReference } from "../utils/references";
import { getAuthenticatedArena } from "./arenaAuth";
import { blockDetail } from "./summarize";

type Input = {
  /**
   * Numeric Are.na block ID or canonical Are.na block URL.
   */
  blockId: string;
};

/**
 * Fetch one Are.na block by id (text content preview, source link, author, public URL).
 */
export default async function tool(input: Input) {
  try {
    const arena = await getAuthenticatedArena();
    const id = arenaReference(input.blockId, "block");
    const block = await arena.block(Number(id)).get();
    return { block: blockDetail(block) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
