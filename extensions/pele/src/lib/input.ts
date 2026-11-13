export const MAX_SOURCE_LENGTH = 50_000;

export function normalizeSource(input: string): string {
  const text = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const blocks = [...text.matchAll(/^\s*((`|~)\2{2,})mermaid[^\S\n]*\n([\s\S]*?)^\s*\1\2*[^\S\n]*$/gim)];
  if (blocks.length > 1) throw new Error("Select one Mermaid diagram at a time.");
  const source = (blocks[0]?.[3] ?? text).trim();
  if (!source) throw new Error("Enter Mermaid code or choose an example from the Actions menu.");
  if (source.length > MAX_SOURCE_LENGTH) throw new Error("The diagram exceeds the 50,000 character limit.");
  return source;
}

export async function readInput(
  readSelection: () => Promise<string>,
  readClipboard: () => Promise<string | undefined>,
) {
  try {
    const selection = await readSelection();
    if (selection.trim()) return selection;
  } catch {
    // Some applications do not expose their selection. The clipboard remains available.
  }
  return (await readClipboard()) ?? "";
}
