import { loadChannels } from "../lib/sunsama-client";

/**
 * List every channel (and category) in the user's Sunsama workspace.
 *
 * Use it to find the exact channel name before creating a task in a channel
 * or moving one. Names are what the other tools take, not ids.
 */
export default async function tool() {
  const channels = await loadChannels();
  return channels.map((c) => ({
    name: c.name,
    category: c.isCategory ? undefined : (c.categoryName ?? undefined),
    isCategory: c.isCategory ?? false,
  }));
}
