import { Channel } from "./types";

/**
 * Whether a channel matches what was typed.
 *
 * Every whitespace-separated piece of the query has to appear somewhere in the
 * channel's name or its category, so word order doesn't matter and "bark stay"
 * finds "Bark & Stay Retreat" just as "bark & stay" does.
 *
 * The pickers filter with this rather than leaving it to Raycast: reaching a
 * channel the stored list is missing means sending the query to the server,
 * and once a component handles the search text Raycast stops filtering for it.
 */
export function matchesChannel(channel: Channel, query: string): boolean {
  const parts = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return true;

  const haystack =
    `${channel.name} ${channel.categoryName ?? ""}`.toLowerCase();
  return parts.every((part) => haystack.includes(part));
}

/** Whether the literal "No channel" option matches what was typed. */
export function matchesNoChannel(query: string): boolean {
  const parts = query.toLowerCase().split(/\s+/).filter(Boolean);
  return parts.every((part) => "no channel".includes(part));
}

/**
 * How a channel field stands relative to what the form filled in for the user.
 *
 * `autoFilled` is the channel that was applied programmatically — the recent or
 * default one — and is still waiting to be seen come back through `onChange`,
 * which Raycast also fires for a value set in code. `touched` is whether the
 * user has picked a channel themselves.
 */
export interface ChannelPickState {
  autoFilled: string | null;
  touched: boolean;
}

/**
 * Fold one channel selection into the pick state.
 *
 * A linked task can have its channel chosen server-side by an automation, and
 * that should only happen while the user has left the field alone. Deciding
 * that by comparing the field to the auto-filled channel at submit time gets it
 * wrong when the user switches away and back: the values match again, but the
 * choice was still deliberate. So the pick is recorded as it happens and never
 * unrecorded.
 *
 * The one selection that doesn't count is the echo of the channel just applied
 * in code, which is consumed the first time it arrives.
 *
 * @param  state The state so far.
 * @param  pick  The channel name now selected ("" for no channel).
 * @return The updated state.
 */
export function nextChannelPickState(
  state: ChannelPickState,
  pick: string,
): ChannelPickState {
  if (pick === state.autoFilled) return { ...state, autoFilled: null };
  return { ...state, touched: true };
}
