import { positional } from "./args.ts";

const OPERATOR_NAMES =
  "from|to|cc|subject|before|after|newer_than|older_than|has|is|category|assigned_to|assigned_by|filename";
const OPERATOR = new RegExp(`^(${OPERATOR_NAMES}):\\S`);
/// An operator still waiting for its value, e.g. right after picking a tip.
const DANGLING = new RegExp(`^(${OPERATOR_NAMES}|in):$`);
const FOLDER = /^in:(\S+)$/i;

export interface Query {
  topic: string;
  filter: string;
  /// Unified folder from `in:sent`, capitalized the way the CLI names it.
  folder?: string;
}

/// Splits search bar text into a free-text topic, Gmail-style operators, and
/// an `in:` folder: `budget from:alice@co.com newer_than:30d` -> topic
/// "budget", filter "from:alice@co.com newer_than:30d". Quoted operator values
/// (`subject:"q3 plan"`) stay attached to their operator; an operator without
/// a value yet (`from:`) is left out until one is typed.
export function splitQuery(text: string): Query {
  const tokens = (text.match(/\S+?:"[^"]*"|\S+/g) ?? []).filter((t) => !DANGLING.test(t));
  const folderToken = tokens.find((t) => FOLDER.test(t));
  const folderName = folderToken?.match(FOLDER)?.[1];
  const rest = tokens.filter((t) => t !== folderToken);
  return {
    topic: rest.filter((t) => !OPERATOR.test(t)).join(" "),
    filter: rest.filter((t) => OPERATOR.test(t)).join(" "),
    folder: folderName && folderName[0].toUpperCase() + folderName.slice(1).toLowerCase(),
  };
}

/// `search <topic>` returns at most this many matches and has no paging.
export const TOPIC_LIMIT = 20;
/// Filter-only searches list one page of this size.
export const LIST_PAGE_SIZE = 50;

/// The CLI arguments for a parsed search. Without `in:`, both kinds span
/// every folder in every account.
export function searchArgs({ topic, filter, folder }: Query): string[] {
  if (topic) {
    const args = ["search", positional(topic)];
    if (folder) args.push("--in", folder);
    if (filter) args.push("--filter", filter);
    return args;
  }
  const args = folder ? ["emails", folder] : ["search"];
  if (filter) args.push("--filter", filter);
  return [...args, "--page-size", String(LIST_PAGE_SIZE)];
}

/// The heading above the results. It says when they stop at the CLI's limit,
/// so an email that's missing isn't taken for one that doesn't exist, and when
/// matching fell back to keywords. Semantic search always fills its 20 slots
/// with the nearest matches, so there a full list only ranks them; a full
/// keyword list means more emails matched than fit.
export function resultsTitle(result: { topic: boolean; semantic: boolean; hasMore: boolean }): string | undefined {
  const fallback = result.semantic ? "" : " (semantic search unavailable)";
  if (!result.hasMore) return fallback ? "Keyword matches" + fallback : undefined;
  return result.topic
    ? fallback
      ? `Top ${TOPIC_LIMIT} keyword matches${fallback} — refine your search to see others`
      : `Top ${TOPIC_LIMIT} matches`
    : `First ${LIST_PAGE_SIZE} matches — narrow your filters to see more`;
}
