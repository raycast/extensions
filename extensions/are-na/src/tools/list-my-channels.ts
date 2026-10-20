import { pagination } from "../utils/references";
import { getAuthenticatedArena } from "./arenaAuth";
import { channelSummary } from "./summarize";

type Input = {
  /**
   * Page number (1-based). Default 1.
   */
  page?: number;
  /**
   * Channels per page (1–100). Default 24.
   */
  per?: number;
  /**
   * Sort for the list, e.g. updated_at_desc or created_at_desc.
   */
  sort?: "created_at_asc" | "created_at_desc" | "updated_at_asc" | "updated_at_desc";
};

/**
 * List channels belonging to the signed-in Are.na account.
 */
export default async function tool(input: Input = {}) {
  try {
    const { page, per } = pagination(input);
    const sort = input.sort ?? "updated_at_desc";

    const arena = await getAuthenticatedArena();
    const me = await arena.me();
    const { items: channels, meta } = await arena.user(me.slug || me.id).channelsPage({ page, per, sort });

    return {
      channels: channels.map(channelSummary),
      page,
      per,
      count: channels.length,
      has_more: meta.has_more_pages,
      next_page: meta.next_page,
      total_count: meta.total_count,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
