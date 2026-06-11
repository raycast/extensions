import { getPreferenceValues } from "@raycast/api";
import type { SearchSort } from "../api/types";
import { getAuthenticatedArena } from "./arenaAuth";
import { channelSummary } from "./summarize";

type Input = {
  /**
   * Page number (1-based). Default 1.
   */
  page?: number;
  /**
   * Channels per page (1–100). Default 100.
   */
  per?: number;
  /**
   * Sort for the list, e.g. updated_at_desc or created_at_desc.
   */
  sort?: SearchSort;
};

/**
 * List channels belonging to the signed-in Are.na account.
 */
export default async function tool(input: Input = {}) {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const page = Math.max(1, input.page ?? 1);
    const per = Math.min(100, Math.max(1, input.per ?? 100));
    const sort = input.sort ?? (prefs.defaultSearchSort as SearchSort) ?? "updated_at_desc";

    const arena = await getAuthenticatedArena();
    const me = await arena.me();
    const channels = await arena.user(me.slug || me.id).channels({ page, per, sort });

    return {
      channels: channels.map(channelSummary),
      page,
      per,
      count: channels.length,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
