import type { Change } from "../types";

const MAX_TOKENS = 3000;

function tokenise(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

function lcs(a: string[], b: string[]): { aIndices: number[]; bIndices: number[] } {
  const m = a.length;
  const n = b.length;

  // Full DP table — inputs are capped at MAX_TOKENS so worst case is ~9M cells (~72MB)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const aIndices: number[] = [];
  const bIndices: number[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      aIndices.unshift(i - 1);
      bIndices.unshift(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return { aIndices, bIndices };
}

export function buildDiff(original: string, final: string): Change[] {
  if (original === final) return [];

  let aTokens = tokenise(original);
  let bTokens = tokenise(final);

  // Issue #4 fix: cap token count to prevent OOM on very large documents
  if (aTokens.length > MAX_TOKENS) aTokens = aTokens.slice(0, MAX_TOKENS);
  if (bTokens.length > MAX_TOKENS) bTokens = bTokens.slice(0, MAX_TOKENS);

  const { aIndices, bIndices } = lcs(aTokens, bTokens);

  const changes: Change[] = [];
  let ai = 0;
  let bi = 0;
  let li = 0;

  const aOffsets: number[] = [];
  let offset = 0;
  for (const token of aTokens) {
    aOffsets.push(offset);
    offset += token.length;
  }

  while (ai < aTokens.length || bi < bTokens.length) {
    if (li < aIndices.length && ai === aIndices[li] && bi === bIndices[li]) {
      ai++;
      bi++;
      li++;
    } else {
      const origStart = ai;
      const newStart = bi;

      while (ai < aTokens.length && (li >= aIndices.length || ai < aIndices[li])) {
        ai++;
      }
      while (bi < bTokens.length && (li >= bIndices.length || bi < bIndices[li])) {
        bi++;
      }

      const origSpan = aTokens.slice(origStart, ai).join("");
      const newSpan = bTokens.slice(newStart, bi).join("");

      let type: Change["type"];
      if (origSpan.trim() === "") {
        type = "insertion";
      } else if (newSpan.trim() === "") {
        type = "deletion";
      } else {
        type = "replacement";
      }

      changes.push({
        type,
        original: origSpan,
        replacement: newSpan,
        position: aOffsets[origStart] ?? original.length,
      });
    }
  }

  return changes;
}
