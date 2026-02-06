/**
 * Converts single (soft) line breaks in Markdown into explicit hard line breaks,
 * while preserving fenced code blocks as-is.
 *
 * Why:
 * - Many Markdown renderers treat a single `\n` inside a paragraph as a "soft break"
 *   (often rendered as a space), so the visual newline is lost.
 * - A Markdown "hard break" can be expressed as two trailing spaces before `\n`.
 *
 * What it does:
 * - For text outside fenced code blocks, it turns a single newline between two non-empty lines
 *   into `␠␠\n` (two spaces + newline), making the newline visible.
 * - It preserves existing paragraph breaks (blank lines) unchanged.
 * - It does not touch fenced code blocks (```...``` or ~~~...~~~), including fence lines.
 * - It does not add extra spaces if the line already requests a hard break
 *   (ends with two+ spaces or a trailing backslash `\`).
 *
 * Notes / limitations:
 * - This function intentionally targets fenced code blocks only.
 *   It does not try to fully parse Markdown (lists, tables, blockquotes, inline code, HTML).
 *   However, since it does NOT introduce blank lines, it is generally safer for lists/tables/quotes
 *   than a `\n -> \n\n` approach.
 */
export function convertSoftLineBreaksToHard(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  let inFence = false;
  let fenceChar: "`" | "~" | null = null;
  let fenceLen = 0;

  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

    const fenceInfo = _getFenceInfo(line);

    // Determine whether this line is a fence delimiter line (opening or closing),
    // and update fence state accordingly.
    const isFenceLine =
      fenceInfo !== null &&
      fenceInfo.len >= 3 &&
      (!inFence || (inFence && fenceInfo.char === fenceChar && fenceInfo.len >= fenceLen));

    if (isFenceLine) {
      if (!inFence) {
        inFence = true;
        fenceChar = fenceInfo!.char;
        fenceLen = fenceInfo!.len;
      } else {
        // closing fence
        inFence = false;
        fenceChar = null;
        fenceLen = 0;
      }
    }

    // Emit the line itself
    result.push(line);

    // Last line: no newline to append
    if (nextLine === null) break;

    // Always keep original newlines inside code fences and after fence delimiter lines
    if (inFence || isFenceLine) {
      result.push("\n");
      continue;
    }

    // Preserve paragraph breaks (blank lines) as-is
    if (line.length === 0 || nextLine.length === 0) {
      result.push("\n");
      continue;
    }

    // If line already encodes a hard break, keep as-is
    if (/ {2,}$/.test(line) || /\\$/.test(line)) {
      result.push("\n");
      continue;
    }

    // Convert a single soft break to a Markdown hard break
    result.push("  \n");
  }

  return result.join("");
}

function _getFenceInfo(line: string): { char: "`" | "~"; len: number } | null {
  const m = line.match(/^\s*([`~]{3,})/);
  if (!m) return null;
  const seq = m[1];
  return { char: seq[0] as "`" | "~", len: seq.length };
}
