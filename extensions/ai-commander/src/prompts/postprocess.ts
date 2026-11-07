/** Final cleanup of a model result. Pure and linear, it runs on every result. */

interface FenceMarker {
  char: string;
  length: number;
}

function readFenceMarker(line: string): FenceMarker | undefined {
  const char = line.charAt(0);
  if (char !== "`" && char !== "~") return undefined;
  let length = 1;
  while (line.charAt(length) === char) length += 1;
  return length >= 3 ? { char, length } : undefined;
}

function closesFence(line: string, open: FenceMarker): boolean {
  const trimmed = line.trimEnd();
  const marker = readFenceMarker(trimmed);
  return (
    marker !== undefined &&
    marker.char === open.char &&
    marker.length >= open.length &&
    marker.length === trimmed.length
  );
}

function startsWithFence(text: string): boolean {
  return readFenceMarker(text.trimStart()) !== undefined;
}

/**
 * Unwraps a code block only if it spans the whole text. A closing line in the middle means two blocks with prose in
 * between, where only the outer lines look like a wrapper.
 */
function stripWrapperFence(text: string): string {
  const lines = text.split(/\r?\n/);
  const first = lines[0];
  const last = lines[lines.length - 1];
  if (first === undefined || last === undefined || lines.length < 2) return text;

  const open = readFenceMarker(first);
  if (!open || !closesFence(last, open)) return text;
  // Backtick fences cannot have backticks in the info string, so this is inline code, not a fence.
  if (open.char === "`" && first.slice(open.length).includes("`")) return text;

  const inner = lines.slice(1, -1);
  return inner.some((line) => closesFence(line, open)) ? text : inner.join("\n");
}

/**
 * Removes closed `<think>` blocks. A tag scan instead of a lazy regex keeps this linear when many blocks stay open.
 * An unclosed block is dropped only at the very start, where it means truncated reasoning; later it may be content.
 */
function stripThinkBlocks(text: string): string {
  const tags = /<\/?think>/gi;
  let result = "";
  let copiedTo = 0;
  let openedAt = -1;

  for (const match of text.matchAll(tags)) {
    const closing = match[0].charAt(1) === "/";
    if (!closing && openedAt === -1) {
      openedAt = match.index;
    } else if (closing && openedAt !== -1) {
      result += text.slice(copiedTo, openedAt);
      copiedTo = match.index + match[0].length;
      openedAt = -1;
    }
  }

  if (openedAt !== -1 && (result + text.slice(copiedTo, openedAt)).trim() === "") return "";
  return result + text.slice(copiedTo);
}

/**
 * The text that replaces the selection when the result goes below it. `result` already carries the selection's outer
 * whitespace from `cleanOutput`; that is removed here, and the trailing part moves behind the result, so that whatever
 * follows in the document stays where it was.
 */
export function insertAfterSelection(selection: string, result: string): string {
  const body = selection.trimEnd();
  return `${body}\n\n${result.trim()}${selection.slice(body.length)}`;
}

/**
 * @param output Raw model output.
 * @param original The text the result will replace. It decides whether a fence or a think tag belongs to the content
 * (the user's own text already had one) and supplies the surrounding whitespace, so replacing a paragraph keeps the
 * blank lines around it.
 * @returns The cleaned text, or "" when nothing is left, so that callers can report an empty result.
 */
export function cleanOutput(output: string, original?: string): string {
  const source = original ?? "";
  const withoutThink = /<think>/i.test(source) ? output : stripThinkBlocks(output);
  const trimmed = withoutThink.trim();
  const core = startsWithFence(source) ? trimmed : stripWrapperFence(trimmed).trim();
  if (core === "") return "";

  const leading = source.slice(0, source.length - source.trimStart().length);
  const trailing = source.trim() === "" ? "" : source.slice(source.trimEnd().length);
  return leading + core + trailing;
}
