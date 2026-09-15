import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference, pagination } from "../utils/references";
import { summarizeItem } from "./get-channel-contents";
type Input = {
  /** User ID, slug, or Are.na profile URL. */
  identifier: string;
  /** Optional content type filter. */
  type?: "Block" | "Channel" | "Text" | "Image" | "Link" | "Attachment" | "Embed";
  /** Default recently updated first. */
  sort?: "created_at_asc" | "created_at_desc" | "updated_at_asc" | "updated_at_desc";
  /** Page number, starting at 1. */
  page?: number;
  /** Results per page, 1–100. Default 24. */
  per?: number;
};
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.identifier, "user");
    const params = pagination(input);
    const arena = await getAuthenticatedArena();
    const { items, meta } = await arena.user(id).contents({ ...params, type: input.type, sort: input.sort });
    return {
      items: items.map(summarizeItem),
      ...params,
      has_more: meta.has_more_pages,
      next_page: meta.next_page,
      total_count: meta.total_count,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
