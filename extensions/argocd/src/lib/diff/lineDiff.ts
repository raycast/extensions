/**
 * A unified line diff.
 *
 * This exists because the `diff` field of ArgoCD's managed-resources response is not something
 * to rely on: it is declared in the schema, and the web UI computes its own diff client-side
 * from `targetState` and `normalizedLiveState` instead. An earlier version of this extension
 * assumed the field was populated because it existed, which is the same mistake as trusting the
 * `fields` query parameter for the same reason. So the diff is computed here, from the two
 * states, and ArgoCD's own string is used only when it happens to be non-empty.
 *
 * The algorithm is Myers' longest common subsequence via a dynamic programming table. Resource
 * manifests are hundreds of lines, not hundreds of thousands, so the quadratic table is the
 * right trade for code that can be read and tested. `MAX_LINES` is the guard that keeps that
 * true.
 */

export type ChangeKind = "context" | "added" | "removed";

export interface DiffLine {
  kind: ChangeKind;
  text: string;
}

export interface DiffHunk {
  /** 1-based start line in the target and in the live text. */
  targetStart: number;
  liveStart: number;
  lines: DiffLine[];
}

/** Beyond this, the quadratic table stops being a reasonable trade. */
export const MAX_LINES = 4000;

export class DiffTooLargeError extends Error {
  constructor(readonly lines: number) {
    super(`Refusing to diff ${lines} lines, which is beyond the ${MAX_LINES} line limit.`);
    this.name = "DiffTooLargeError";
  }
}

function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return normalized.length === 0 ? [] : normalized.split("\n");
}

/**
 * Builds the longest common subsequence of two line arrays as a list of index pairs, so both
 * the additions and the removals can be recovered from it.
 */
function commonSubsequence(a: string[], b: string[]): [number, number][] {
  const rows = a.length;
  const columns = b.length;
  // One row of the table at a time is not enough to walk the path back, so the whole table is
  // kept. rows and columns are bounded by MAX_LINES.
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      const row = table[i] as number[];
      const next = table[i + 1] as number[];
      row[j] =
        a[i] === b[j] ? (next[j + 1] as number) + 1 : Math.max(next[j] as number, row[j + 1] as number);
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
      continue;
    }
    const next = table[i + 1] as number[];
    const row = table[i] as number[];
    if ((next[j] as number) >= (row[j + 1] as number)) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * Diffs `removedText` (the live state) against `addedText` (the desired state), so a `-` line
 * is what the cluster has and a `+` line is what git asks for, matching ArgoCD's own reading.
 */
export function diffLines(removedText: string, addedText: string): DiffLine[] {
  const removed = splitLines(removedText);
  const added = splitLines(addedText);

  if (removed.length + added.length > MAX_LINES) {
    throw new DiffTooLargeError(removed.length + added.length);
  }

  const pairs = commonSubsequence(removed, added);
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  for (const [ri, ai] of pairs) {
    while (i < ri) {
      lines.push({ kind: "removed", text: removed[i++] as string });
    }
    while (j < ai) {
      lines.push({ kind: "added", text: added[j++] as string });
    }
    lines.push({ kind: "context", text: removed[i] as string });
    i++;
    j++;
  }
  while (i < removed.length) {
    lines.push({ kind: "removed", text: removed[i++] as string });
  }
  while (j < added.length) {
    lines.push({ kind: "added", text: added[j++] as string });
  }

  return lines;
}

/**
 * Groups the changes into hunks with `context` lines around each, which is what makes a diff of
 * a 300 line manifest readable when three lines changed.
 */
export function toHunks(lines: DiffLine[], context = 3): DiffHunk[] {
  const changed = lines
    .map((line, index) => (line.kind === "context" ? -1 : index))
    .filter((index) => index !== -1);
  if (changed.length === 0) {
    return [];
  }

  const ranges: [number, number][] = [];
  let start = Math.max(0, (changed[0] as number) - context);
  let end = Math.min(lines.length - 1, (changed[0] as number) + context);
  for (const index of changed.slice(1)) {
    if (index - context <= end + 1) {
      end = Math.min(lines.length - 1, index + context);
    } else {
      ranges.push([start, end]);
      start = Math.max(0, index - context);
      end = Math.min(lines.length - 1, index + context);
    }
  }
  ranges.push([start, end]);

  const hunks: DiffHunk[] = [];
  for (const [from, to] of ranges) {
    let targetStart = 1;
    let liveStart = 1;
    for (let index = 0; index < from; index++) {
      const kind = (lines[index] as DiffLine).kind;
      if (kind !== "added") liveStart++;
      if (kind !== "removed") targetStart++;
    }
    hunks.push({ liveStart, targetStart, lines: lines.slice(from, to + 1) });
  }
  return hunks;
}

/** Renders hunks as unified diff text, ready for a ```diff fence. */
export function renderUnified(hunks: DiffHunk[]): string {
  const out: string[] = [];
  for (const hunk of hunks) {
    const removed = hunk.lines.filter((line) => line.kind !== "added").length;
    const added = hunk.lines.filter((line) => line.kind !== "removed").length;
    out.push(`@@ -${hunk.liveStart},${removed} +${hunk.targetStart},${added} @@`);
    for (const line of hunk.lines) {
      const marker = line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " ";
      out.push(`${marker}${line.text}`);
    }
  }
  return out.join("\n");
}

export interface DiffStats {
  added: number;
  removed: number;
}

export function countChanges(lines: DiffLine[]): DiffStats {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.kind === "added") added++;
    if (line.kind === "removed") removed++;
  }
  return { added, removed };
}
