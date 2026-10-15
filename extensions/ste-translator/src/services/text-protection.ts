/**
 * Replaces technical strings with opaque placeholders before the text goes to an AI provider,
 * and restores them afterwards. Placeholders look like [[P0]], [[P1]], ...
 */

export interface ProtectedText {
  text: string;
  tokens: string[];
}

const PATTERNS: RegExp[] = [
  /(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\1[ \t]*(?=\n|$)/g, // fenced code blocks
  /(`+)(?!`)[^\n]*?[^`\n]\1(?!`)|``/g, // inline code
  /\bhttps?:\/\/[^\s<>"')\]]+/gi, // URLs
  /\barn:aws[a-z-]*:[A-Za-z0-9-]*:[A-Za-z0-9-]*:[0-9]*:[^\s,;"')]+/g, // AWS ARNs
  /\/subscriptions\/[0-9a-f-]{36}[^\s,;"')]*/gi, // Azure resource IDs
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUIDs
  /\b(?:i|vol|sg|subnet|vpc|ami|snap|eni|rtb|igw)-[0-9a-f]{8,17}\b/g, // cloud resource IDs
  /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, // email addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?(?::\d{1,5})?\b/g, // IPv4 (CIDR, port)
  /(?<![\w:])(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})?|::[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})(?:\/\d{1,3})?(?![\w:])/gi, // IPv6
  /(?<![\w/.~-])(?:[A-Za-z]:\\|~\/|\.{1,2}\/|\/)[\w.@%+~-]+(?:[\\/][\w.@%+~-]+)*[\\/]?(?<=[\w@%+~/\\-])/g, // file paths
  /(?<![\w-])--[a-z][\w-]*(?:=\S+)?/g, // CLI long flags
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, // ENV_STYLE_KEYS
  /\b[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*){2,}\b/g, // dotted.config.keys
  /"[^"\n]{1,200}"/g, // double-quoted strings (error messages, literals)
  /(?<![\w.])[-+]?\d+(?:[.,]\d+)*(?:\s?(?:[KMGTP]i?B|[kKMGT]?B|[kMG]?Hz|ms|µs|ns|sec|min|hrs?|[kKmM]?[gG]|[kM]?V|[kmM]?A|[kM]?W|px|vCPUs?|cores?)\b(?:\/s)?|\s?(?:%|°[CF]))/g, // numbers with units
];

export function protectText(input: string): ProtectedText {
  // Collect matches from every pattern against the original text, then keep the leftmost,
  // longest non-overlapping spans. A quoted error message that contains a flag or an IP address
  // therefore becomes one token, never a token that holds another placeholder.
  const spans: { start: number; end: number }[] = [];
  for (const pattern of PATTERNS) {
    for (const match of input.matchAll(pattern)) {
      if (match[0].length > 0) spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const tokens: string[] = [];
  let text = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    text += input.slice(cursor, span.start) + placeholder(tokens.length);
    tokens.push(input.slice(span.start, span.end));
    cursor = span.end;
  }
  return { text: text + input.slice(cursor), tokens };
}

export function placeholder(id: number): string {
  return `[[P${id}]]`;
}

const PLACEHOLDER_RE = /\[\[\s*P(\d+)\s*\]\]/g;

/** Substitute placeholders back. Unknown placeholder ids are left untouched so validation can flag them. */
export function restoreText(text: string, tokens: string[]): string {
  return text.replace(PLACEHOLDER_RE, (whole, id: string) => tokens[Number(id)] ?? whole);
}

export interface PlaceholderCheck {
  missing: number[];
  duplicated: number[];
  unknown: number[];
}

export function checkPlaceholders(output: string, tokenCount: number): PlaceholderCheck {
  const counts = new Map<number, number>();
  for (const match of output.matchAll(PLACEHOLDER_RE)) {
    const id = Number(match[1]);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const missing: number[] = [];
  const duplicated: number[] = [];
  for (let id = 0; id < tokenCount; id++) {
    const count = counts.get(id) ?? 0;
    if (count === 0) missing.push(id);
    else if (count > 1) duplicated.push(id);
  }
  const unknown = [...counts.keys()].filter((id) => id >= tokenCount);
  return { missing, duplicated, unknown };
}
