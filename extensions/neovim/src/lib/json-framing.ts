export function extractLastJsonArray(raw: string): string {
  // The dump array is the final print() of the script. vim.json.encode
  // produces compact JSON with no embedded newlines, and print() appends
  // one \n. So the real payload's opening [ is always at position 0 or
  // immediately after a newline — never inside a JSON string value on an
  // earlier line. We anchor on that positional invariant so that:
  //   • startup noise with unbalanced quotes cannot poison the scan
  //   • brackets inside serialized string values (e.g. rhs "echo [1,2]")
  //     do not hijack the framing
  for (let start = raw.length - 1; start >= 0; start--) {
    if (raw[start] !== "[") continue;
    // The real payload always starts at the beginning of a line.
    if (start > 0 && raw[start - 1] !== "\n") continue;
    const end = matchArrayEnd(raw, start);
    if (end < 0) continue;
    const slice = raw.substring(start, end + 1);
    try {
      JSON.parse(slice);
      return slice;
    } catch {
      // not a valid array, keep scanning earlier candidates
    }
  }
  throw new Error("No JSON keymap array found");
}

function matchArrayEnd(raw: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
