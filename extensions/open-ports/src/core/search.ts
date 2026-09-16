import { Listener } from "./types";

/**
 * Relevance tiers for the Kill Listening Process search. Exact identifiers outrank prefix
 * matches, which outrank a plain substring hit anywhere in the row.
 */
const SCORE = {
  exactPort: 100,
  exactPid: 90,
  exactName: 80,
  namePrefix: 70,
  substring: 10,
  none: 0,
} as const;

export function rankListeners(listeners: readonly Listener[], query: string): Listener[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...listeners];

  return listeners
    .map((listener) => ({ listener, score: scoreListener(listener, needle) }))
    .filter((entry) => entry.score > SCORE.none)
    .sort((a, b) => b.score - a.score || a.listener.port - b.listener.port || a.listener.pid - b.listener.pid)
    .map((entry) => entry.listener);
}

function scoreListener(listener: Listener, needle: string): number {
  const command = listener.command.toLowerCase();

  if (String(listener.port) === needle) return SCORE.exactPort;
  if (String(listener.pid) === needle) return SCORE.exactPid;
  if (command === needle) return SCORE.exactName;
  if (command.startsWith(needle)) return SCORE.namePrefix;

  const haystack = [
    listener.command,
    listener.user,
    String(listener.pid),
    String(listener.port),
    ...listener.bindings.map((binding) => binding.address),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle) ? SCORE.substring : SCORE.none;
}
