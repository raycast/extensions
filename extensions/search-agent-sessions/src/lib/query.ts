import type { Agent } from "./types";

export interface ParsedQuery {
  /** Bare terms: case-insensitive, order-independent, need not be adjacent. */
  words: string[];
  /** `dir:` filters — case-insensitive substrings of the session cwd, all required. */
  dirs: string[];
  agent?: Agent;
  /** Rejected `agent:` values, so the empty state can name the typo. */
  unknownAgents: string[];
}

/**
 * Members are checked against `Agent` by the annotation, so the union stays the
 * single definition of what an agent is; the validator and the search-bar
 * dropdown only consume it. Ordered, since it is also the order shown there.
 */
export const AGENTS: readonly Agent[] = ["claude", "codex"];

const AGENT_SET: ReadonlySet<string> = new Set<string>(AGENTS);

export function isAgent(value: string): value is Agent {
  return AGENT_SET.has(value);
}

export function parseQuery(raw: string): ParsedQuery {
  const parsed: ParsedQuery = { words: [], dirs: [], unknownAgents: [] };
  for (const token of raw.split(/\s+/)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    if (lower.startsWith("dir:")) {
      const value = lower.slice(4);
      if (value) parsed.dirs.push(value);
    } else if (lower.startsWith("agent:")) {
      const value = lower.slice(6);
      // A misspelled value is both searched for and recorded: searching keeps
      // it from silently returning everything unfiltered, and the record lets
      // the empty state say which value was rejected. A bare `agent:` is
      // someone mid-keystroke, so it is dropped like a bare `dir:`.
      if (isAgent(value)) parsed.agent = value;
      else if (value) {
        parsed.words.push(lower);
        parsed.unknownAgents.push(value);
      }
    } else {
      parsed.words.push(lower);
    }
  }
  return parsed;
}
