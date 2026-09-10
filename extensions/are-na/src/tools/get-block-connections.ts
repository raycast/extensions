import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference, pagination } from "../utils/references";
import { channelSummary } from "./summarize";
type Input = {
  /** Block ID or Are.na block URL. */
  blockId: string;
  /** Page number, starting at 1. */
  page?: number;
  /** Results per page, 1–100. Default 24. */
  per?: number;
};
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.blockId, "block");
    const params = pagination(input);
    const arena = await getAuthenticatedArena();
    const { items, meta } = await arena.block(id).connections(params);
    return {
      channels: items.map(channelSummary),
      ...params,
      has_more: meta.has_more_pages,
      next_page: meta.next_page,
      total_count: meta.total_count,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
