import { pagination } from "../utils/references";
import { getPreferenceValues } from "@raycast/api";
import type { SearchSort } from "../api/types";
import { getAuthenticatedArena } from "./arenaAuth";
import { blockSummary, channelSummary, userSummary } from "./summarize";

type Input = {
  /**
   * Search query (keywords or phrase). Use * or a broad term to explore when the user has no specific query.
   */
  query: string;
  /** Filter results by content type. Omit for all types. */
  type?: "All" | "Block" | "Channel" | "User" | "Text" | "Image" | "Link" | "Attachment" | "Embed";
  /**
   * Page number (1-based). Default 1.
   */
  page?: number;
  /**
   * Results per page (1–100). Defaults to the extension preference.
   */
  per?: number;
  /**
   * Sort order: score_desc (best match), updated_at_desc, created_at_desc, etc.
   */
  sort?: SearchSort;
  /**
   * Limit whose content to search: "all" (default), "my", or "following".
   */
  scope?: "all" | "my" | "following";
};

/**
 * Search Are.na for channels, blocks, and users in one call. Prefer this when the user wants to discover or look up multiple kinds of content.
 */
export default async function tool(input: Input) {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const defaultPer = Math.min(100, Math.max(1, parseInt(prefs.defaultPageSize ?? "24", 10) || 24));
    const { page, per } = pagination(input, defaultPer);
    const sort = input.sort ?? (prefs.defaultSearchSort as SearchSort) ?? "score_desc";

    const arena = await getAuthenticatedArena();
    const result = await arena.search(input.query?.trim() || "*").all({
      page,
      per,
      sort,
      scope: input.scope,
      type: input.type,
    });

    return {
      query: result.term,
      page: result.current_page,
      per: result.per,
      total_count: result.meta?.total_count ?? 0,
      has_more: result.meta?.has_more_pages ?? false,
      next_page: result.meta?.next_page ?? null,
      channels: result.channels.map(channelSummary),
      blocks: result.blocks.map(blockSummary),
      users: result.users.map(userSummary),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
