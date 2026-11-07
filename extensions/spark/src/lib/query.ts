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
