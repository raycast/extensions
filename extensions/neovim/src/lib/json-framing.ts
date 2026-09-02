export function extractLastJsonArray(raw: string): string {
  // The dump array is the final print() of the script, so scan '['
  // positions right-to-left and take the first that lexes as a complete,
  // valid JSON array. Each candidate is matched and validated with fresh
  // state, so startup noise before the payload (unbalanced quotes, stray
  // brackets from plugin messages) cannot poison the framing.
  for (let start = raw.length - 1; start >= 0; start--) {
    if (raw[start] !== "[") continue;
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
