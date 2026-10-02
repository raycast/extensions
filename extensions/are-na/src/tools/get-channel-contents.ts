import { arenaReference, pagination } from "../utils/references";
import { getPreferenceValues } from "@raycast/api";
import type { Block } from "../api/types";
import { getAuthenticatedArena } from "./arenaAuth";
import { blockSummary } from "./summarize";

type Input = {
  /**
   * Channel id (digits only) or slug for the Are.na API.
   */
  identifier: string;
  /**
   * Page of contents (1-based). Default 1.
   */
  page?: number;
  /**
   * Items per page (1–100). Defaults to extension preference.
   */
  per?: number;
  /**
   * Sort order for contents.
   */
  sort?: "position_asc" | "position_desc" | "created_at_asc" | "created_at_desc" | "updated_at_asc" | "updated_at_desc";
};

type ChannelBlockFields = { open?: boolean; length?: number };

export function summarizeItem(item: Block) {
  if (item.class === "Channel") {
    const ext = item as Block & ChannelBlockFields;
    const status = item.visibility === "private" ? "private" : ext.open === false ? "closed" : "public";
    const title = item.generated_title || item.title || "Untitled";
    const ownerSlug = item.user.slug;
    return {
      kind: "channel" as const,
      id: item.id,
      title,
      slug: item.slug,
      owner_slug: ownerSlug,
      status,
      block_count: ext.length ?? 0,
      connection_id: item.connection?.id ?? null,
      url: `https://www.are.na/${ownerSlug}/${item.slug}`,
    };
  }
  return { kind: "block" as const, ...blockSummary(item) };
}

/**
 * List blocks and nested channels inside an Are.na channel (paginated).
 */
export default async function tool(input: Input) {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const defaultPer = Math.min(100, Math.max(1, parseInt(prefs.defaultPageSize ?? "24", 10) || 24));
    const { page, per } = pagination(input, defaultPer);
    const sort = input.sort ?? "position_asc";

    const arena = await getAuthenticatedArena();
    const ref = arenaReference(input.identifier, "channel");
    const { items, meta } = await arena.channel(ref).contents({ page, per, sort });

    return {
      identifier: input.identifier,
      page,
      per,
      items: items.map(summarizeItem),
      has_more: meta.has_more_pages,
      next_page: meta.next_page,
      total_count: meta.total_count,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
