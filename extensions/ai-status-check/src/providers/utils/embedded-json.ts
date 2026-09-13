export function extractBalancedObject(text: string, openIndex: number): string | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return text.slice(openIndex, index + 1);
  }
  return undefined;
}
