/** Slice the JSON object that opens at `openIndex`, skipping braces in strings. */
export function extractBalancedObject(
  text: string,
  openIndex: number,
): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(openIndex, i + 1);
      }
    }
  }

  return null;
}
