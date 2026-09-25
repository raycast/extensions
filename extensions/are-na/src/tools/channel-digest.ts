import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference, pagination } from "../utils/references";
import { channelSummary, userSummary } from "./summarize";
import { summarizeItem } from "./get-channel-contents";
type Input = {
  /** Channel ID, slug, or Are.na channel URL. */
  identifier: string;
  /** Number of items to sample, 1–100. Default 24. */
  sampleSize?: number;
};
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.identifier, "channel");
    const params = pagination({ per: input.sampleSize });
    const arena = await getAuthenticatedArena();
    const [channel, contents] = await Promise.all([
      arena.channel(id).get(),
      arena.channel(id).contents({ ...params, sort: "position_desc" }),
    ]);
    const types: Record<string, number> = {};
    for (const item of contents.items) types[item.class] = (types[item.class] ?? 0) + 1;
    return {
      channel: channelSummary(channel),
      collaborators: channel.collaborators.map(userSummary),
      sampled_count: contents.items.length,
      total_count: contents.meta.total_count,
      is_sample: contents.meta.has_more_pages || contents.meta.total_count > contents.items.length,
      sample_type_counts: types,
      items: contents.items.map(summarizeItem),
      next_page: contents.meta.next_page,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
