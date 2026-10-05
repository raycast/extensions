/**
 * Word-level comparison of the original text and the model's reply.
 * Returns the reply split into runs, each flagged as new or unchanged.
 * Removed words are not part of the output: the text reads as the final
 * version, with the changes marked. Plain LCS on whitespace tokens.
 */
export interface Part {
  text: string;
  added: boolean;
}

export interface WordChanges {
  parts: Part[];
  /** Number of added or changed words. 0 means the reply equals the original. */
  changes: number;
  /** True when the reply is mostly new text (a summary, a translation): marking it would just color everything. */
  rewritten: boolean;
}

export function wordChanges(before: string, after: string): WordChanges | null {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > 4_000_000) return null;

  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: Part[] = [];
  const push = (text: string, added: boolean) => {
    const last = parts[parts.length - 1];
    if (last && last.added === added) last.text += text;
    else parts.push({ text, added });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(b[j], false);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++; // removed from the original: not shown
    } else {
      push(b[j], true);
      j++;
    }
  }
  while (j < m) push(b[j++], true);

  const changes = parts.filter((p) => p.added).reduce((sum, p) => sum + p.text.split(/\s+/).filter(Boolean).length, 0);
  const words = b.filter((t) => t.trim()).length;
  return { parts, changes, rewritten: words > 0 && changes / words > 0.6 };
}

function tokenize(s: string): string[] {
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

/** The reply as markdown with new or changed words in bold. Pasting uses the plain text, never this. */
export function boldChanges(parts: Part[]): string {
  return parts
    .map((p) => {
      if (!p.added) return p.text;
      // Bold each line on its own so a marker never spans a line break, and keep
      // whitespace outside the markers so ** renders.
      return p.text
        .split(/(\n+)/)
        .map((seg) => {
          if (!seg || /^\n+$/.test(seg)) return seg;
          const lead = seg.match(/^\s*/)?.[0] ?? "";
          const trail = seg.match(/\s*$/)?.[0] ?? "";
          const core = seg.trim();
          return core ? `${lead}**${core}**${trail}` : seg;
        })
        .join("");
    })
    .join("");
}
