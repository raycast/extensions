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
