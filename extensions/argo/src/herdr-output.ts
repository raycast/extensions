const promptPrefixes = ["", "❯ ", "› ", "> "];

// Exact whole-message echoes only; quoted examples inside Markdown fences are not prompts.
function echoEnd(lines: string[], message: string[], from = 0): number | null | undefined {
  if (!message.length || !message.some((line) => line.trim())) return;
  let end: number | undefined;
  let fence: { char: string; length: number } | undefined;
  for (let i = 0; i <= lines.length - message.length; i++) {
    const line = lines[i]!;
    const mark = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (mark && mark[1]![0] === fence.char && mark[1]!.length >= fence.length && !mark[2]!.trim()) fence = undefined;
      continue;
    }
    if (
      i >= from &&
      promptPrefixes.some(
        (prefix) =>
          line === prefix + message[0] &&
          ["", ...(prefix ? ["  "] : [])].some((indent) =>
            message.slice(1).every((part, j) => lines[i + j + 1] === indent + part),
          ),
      )
    ) {
      // Multiple exact occurrences are ambiguous: do not select an arbitrary "latest" one.
      if (end !== undefined) return null;
      end = i + message.length;
      i = end - 1;
    } else if (mark) fence = { char: mark[1]![0]!, length: mark[1]!.length };
  }
  return end;
}

// A terminal newline terminates a row; it is not an extra empty row in the next capture.
function rows(text: string): string[] {
  return text ? text.replace(/\n$/, "").split("\n") : [];
}

function meaningfulAnchor(lines: string[]): boolean {
  const lengths = lines.map((line) => (line.match(/[\p{L}\p{N}]/gu) ?? []).length);
  // ponytail: conservative screen anchors; use terminal-provided turn IDs if available instead.
  return lengths.some((length) => length >= 48) || lengths.filter((length) => length >= 8).length >= 2;
}

function extracted(lines: string[]): { text: string; isolated: boolean } {
  let start = 0;
  let end = lines.length;
  while (start < end && /^[\t ]*$/.test(lines[start]!)) start++;
  while (end > start && /^[\t ]*$/.test(lines[end - 1]!)) end--;
  return { text: lines.slice(start, end).join("\n"), isolated: true };
}

/**
 * Compare every sanitized HC snapshot to the same pre-send baseline, not the previous poll.
 * Returns terminal text, never Markdown or inferred chat roles. A raw fallback is verbatim.
 */
export function hcReplyText(before: string, current: string, sentText: string): { text: string; isolated: boolean } {
  if (before === current) return { text: "", isolated: true };
  const old = rows(before);
  const now = rows(current);
  const message = sentText ? sentText.split("\n") : [];
  if (!old.length) {
    const echo = echoEnd(now, message);
    return extracted(now.slice(echo ?? 0));
  }

  let prefix = 0;
  while (prefix < old.length && prefix < now.length && old[prefix] === now[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < old.length - prefix &&
    suffix < now.length - prefix &&
    old[old.length - suffix - 1] === now[now.length - suffix - 1]
  )
    suffix++;
  const end = now.length - suffix;

  // A pure insertion accounts for the ENTIRE baseline, not just a common header/footer.
  if (prefix > 0 && prefix + suffix === old.length && old.slice(0, prefix).some((line) => line.trim())) {
    const added = now.slice(prefix, end);
    const echo = echoEnd(now.slice(0, end), message, prefix);
    // Only strip a leading echo here: a later exact quote can be part of the output itself.
    if (typeof echo === "number" && now.slice(prefix, echo - message.length).every((line) => !line.trim()))
      return extracted(now.slice(echo, end));
    return extracted(added);
  }

  // A recognizably exact NEW message can delimit a response even after a full redraw.
  const echo = echoEnd(now, message);
  if (typeof echo === "number" && echoEnd(old, message) === undefined) {
    // A coincidentally repeated last answer must not consume the entire response.
    return extracted(now.slice(echo, end > echo ? end : now.length));
  }

  // Remove a stable footer only AFTER establishing a suffix-prefix scrolling boundary.
  const oldEnd = old.length - suffix;
  // ponytail: quadratic in screen rows; use KMP if HC starts supplying large scrollback captures.
  for (let overlap = Math.min(oldEnd, end - 1); overlap > 0; overlap--) {
    const anchor = old.slice(oldEnd - overlap, oldEnd);
    if (anchor.every((line, i) => line === now[i]) && meaningfulAnchor(anchor)) {
      const added = now.slice(overlap, end);
      const echoed = echoEnd(added, message);
      return extracted(
        typeof echoed === "number" && added.slice(0, echoed - message.length).every((line) => !line.trim())
          ? added.slice(echoed)
          : added,
      );
    }
  }
  return { text: current, isolated: false };
}
