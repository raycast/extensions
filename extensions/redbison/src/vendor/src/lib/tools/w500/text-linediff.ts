/**
 * A line diff, by longest common subsequence.
 *
 * The same shape `diff` prints: a line kept, added or removed, in order. The
 * table is quadratic in the lines that differ, so two things keep it in
 * bounds. The common first and last lines are matched before the table is
 * built, which is free and makes a 20,000-line file with a few edits cheap.
 * And what remains is refused past MAX_DIFF_CELLS rather than allocated: two
 * unrelated 20,000-line files would need 400 million cells, and the CLI, the
 * editors, Raycast and the MCP server all call this synchronously, so it ran
 * them out of memory (raycast/extensions#34044 review, 2026-11).
 */
export type DiffChange = { type: 'eq' | 'add' | 'del'; value: string };

/**
 * Line pairs the table may hold: 16 million, 64 MB as 32-bit cells. Just
 * under the cap (3,998 against 3,998 changed lines) measured 0.1 to 0.3 s and
 * about 107 MB resident under Bun, three runs, 2026-11-26. Past that, a
 * line-by-line answer is unreadable anyway and the caller is told to narrow
 * the comparison.
 */
export const MAX_DIFF_CELLS = 16_000_000;

export class DiffTooLargeError extends Error {}

export function lineDiff(a: string[], b: string[]): DiffChange[] {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;

  const m = a.length - head - tail;
  const n = b.length - head - tail;
  if ((m + 1) * (n + 1) > MAX_DIFF_CELLS) {
    throw new DiffTooLargeError(
      `These texts are too large to compare line by line here: ${m.toLocaleString('en-US')} and ` +
        `${n.toLocaleString('en-US')} lines differ after the matching start and end, and the limit is ` +
        `${MAX_DIFF_CELLS.toLocaleString('en-US')} line pairs. Compare a smaller section, or use git diff or diff for whole files.`,
    );
  }
  const A = a.slice(head, head + m);
  const B = b.slice(head, head + n);
  // One typed row per line of A: a quarter of the memory of number[][].
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffChange[] = a.slice(0, head).map((value) => ({ type: 'eq' as const, value }));
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      out.push({ type: 'eq', value: A[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', value: A[i] });
      i += 1;
    } else {
      out.push({ type: 'add', value: B[j] });
      j += 1;
    }
  }
  while (i < m) {
    out.push({ type: 'del', value: A[i] });
    i += 1;
  }
  while (j < n) {
    out.push({ type: 'add', value: B[j] });
    j += 1;
  }
  for (const value of a.slice(a.length - tail)) out.push({ type: 'eq', value });
  return out;
}

/** The changes as a patch: two spaces, `+ ` or `- ` in front of each line. */
export function unifiedPatch(changes: DiffChange[]): string {
  return changes
    .map((c) => (c.type === 'eq' ? '  ' : c.type === 'add' ? '+ ' : '- ') + c.value)
    .join('\n');
}

export function diffText(a: string, b: string): { patch: string; changes: DiffChange[]; added: number; removed: number } {
  const changes = lineDiff(a.split(/\r?\n/), b.split(/\r?\n/));
  const added = changes.filter((c) => c.type === 'add').length;
  const removed = changes.filter((c) => c.type === 'del').length;
  return { patch: unifiedPatch(changes), changes, added, removed };
}
