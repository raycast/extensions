/**
 * A line diff, by longest common subsequence.
 *
 * The same shape `diff` prints: a line kept, added or removed, in order. It
 * is quadratic in the number of lines, which is fine for the sizes a person
 * pastes into a tool and is the reason the caller, not this function, decides
 * what is too big to accept.
 */
export type DiffChange = { type: 'eq' | 'add' | 'del'; value: string };

export function lineDiff(a: string[], b: string[]): DiffChange[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffChange[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'eq', value: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', value: a[i] });
      i += 1;
    } else {
      out.push({ type: 'add', value: b[j] });
      j += 1;
    }
  }
  while (i < m) {
    out.push({ type: 'del', value: a[i] });
    i += 1;
  }
  while (j < n) {
    out.push({ type: 'add', value: b[j] });
    j += 1;
  }
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
