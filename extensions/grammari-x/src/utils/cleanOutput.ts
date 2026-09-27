const QUOTE_PAIRS: [string, string][] = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["‘", "’"],
  ["«", "»"],
];

/**
 * Models tend to wrap a rewritten sentence in quotes or a code fence even when told
 * not to. Both are stripped only when they enclose the whole answer, so quotes and
 * fences that belong to the text itself survive.
 */
export function cleanOutput(input: string): string {
  let output = input.trim();

  const fence = output.match(/^```[^\n]*\n([\s\S]*)\n```$/);
  if (fence) output = fence[1].trim();

  for (const [open, close] of QUOTE_PAIRS) {
    if (output.length > open.length + close.length && output.startsWith(open) && output.endsWith(close)) {
      const inner = output.slice(open.length, -close.length);
      // Only unwrap when the quotes are decoration, not part of the text.
      if (!inner.includes(open) && !inner.includes(close)) {
        output = inner.trim();
        break;
      }
    }
  }

  return output;
}
