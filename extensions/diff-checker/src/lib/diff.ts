import { DiffResult } from "../types";

const backtrack = (
  trace: Record<number, number>[],
  oldLines: string[],
  newLines: string[],
): { type: " " | "+" | "-"; line: string }[] => {
  let x = oldLines.length;
  let y = newLines.length;
  const edits: { type: " " | "+" | "-"; line: string }[] = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && (v[k - 1] ?? 0) < (v[k + 1] ?? 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = v[prevK] ?? 0;
    const prevY = prevX - prevK;

    // Diagonal (equal lines)
    while (x > prevX && y > prevY) {
      x--;
      y--;
      edits.push({ type: " ", line: oldLines[x] });
    }

    if (d > 0) {
      if (x === prevX) {
        // Insertion
        y--;
        edits.push({ type: "+", line: newLines[y] });
      } else {
        // Deletion
        x--;
        edits.push({ type: "-", line: oldLines[x] });
      }
    }
  }

  return edits.reverse();
};

// Myers diff algorithm on lines — returns a list of edit operations
const myersDiff = (oldLines: string[], newLines: string[]): { type: " " | "+" | "-"; line: string }[] => {
  const n = oldLines.length;
  const m = newLines.length;
  const max = n + m;
  const v: Record<number, number> = { 1: 0 };
  const trace: Record<number, number>[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push({ ...v });
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (v[k - 1] ?? 0) < (v[k + 1] ?? 0))) {
        x = v[k + 1] ?? 0;
      } else {
        x = (v[k - 1] ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      v[k] = x;
      if (x >= n && y >= m) {
        return backtrack(trace, oldLines, newLines);
      }
    }
  }
  return [];
};

export const computeDiff = (original: unknown, modified: unknown): DiffResult => {
  const originalFormatted = JSON.stringify(original, null, 2);
  const modifiedFormatted = JSON.stringify(modified, null, 2);

  const oldLines = originalFormatted.split("\n");
  const newLines = modifiedFormatted.split("\n");

  const edits = myersDiff(oldLines, newLines);

  let additions = 0;
  let removals = 0;
  let hasChanges = false;

  for (const edit of edits) {
    if (edit.type === "+") {
      additions++;
      hasChanges = true;
    } else if (edit.type === "-") {
      removals++;
      hasChanges = true;
    }
  }

  const unchanged = edits.length - additions - removals;

  if (!hasChanges) {
    const markdown = `## Comparison Result\n\nNo differences found — the JSON objects are identical.\n\n---\n\n\`\`\`json\n${originalFormatted}\n\`\`\``;
    return {
      markdown,
      fullDiff: markdown,
      additions: 0,
      removals: 0,
      originalFormatted,
      modifiedFormatted,
    };
  }

  // Full diff (for copying)
  const fullDiffLines: string[] = [];
  for (const edit of edits) {
    const prefix = edit.type === " " ? "  " : edit.type === "+" ? "+ " : "- ";
    fullDiffLines.push(prefix + edit.line);
  }
  const fullDiff = "```diff\n" + fullDiffLines.join("\n") + "\n```";

  // Compact diff (for display) — only changed lines with context, split into chunks
  const contextSize = 3;
  const showIndices = new Set<number>();

  for (let i = 0; i < edits.length; i++) {
    if (edits[i].type !== " ") {
      for (let j = Math.max(0, i - contextSize); j <= Math.min(edits.length - 1, i + contextSize); j++) {
        showIndices.add(j);
      }
    }
  }

  // Expand showIndices to absorb small gaps — don't hide fewer than 4 lines
  const minGap = 4;
  const sortedShown = [...showIndices].sort((a, b) => a - b);
  for (let s = 1; s < sortedShown.length; s++) {
    const gap = sortedShown[s] - sortedShown[s - 1] - 1;
    if (gap > 0 && gap < minGap) {
      for (let g = sortedShown[s - 1] + 1; g < sortedShown[s]; g++) {
        showIndices.add(g);
      }
    }
  }

  const chunks: string[][] = [];
  const skippedCounts: number[] = [];
  let currentChunk: string[] = [];
  let lastShown = -1;

  for (let i = 0; i < edits.length; i++) {
    if (!showIndices.has(i)) continue;

    if (lastShown !== -1 && i - lastShown > 1) {
      chunks.push(currentChunk);
      skippedCounts.push(i - lastShown - 1);
      currentChunk = [];
    }

    const edit = edits[i];
    const prefix = edit.type === " " ? "  " : edit.type === "+" ? "+ " : "- ";
    currentChunk.push(prefix + edit.line);
    lastShown = i;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  const finalSorted = [...showIndices].sort((a, b) => a - b);
  const firstShown = finalSorted[0] ?? 0;
  const lastShownIdx = finalSorted[finalSorted.length - 1] ?? edits.length - 1;
  const skippedBefore = firstShown;
  const skippedAfter = edits.length - 1 - lastShownIdx;

  const summary = `## Comparison Result\n\n**${additions}** added | **${removals}** removed | **${unchanged}** unchanged\n\n---\n\n`;

  const markdownParts: string[] = [summary];

  let leadingLines: string[] = [];
  if (skippedBefore > 0 && skippedBefore < minGap) {
    leadingLines = edits
      .slice(0, firstShown)
      .map((e) => (e.type === " " ? "  " : e.type === "+" ? "+ " : "- ") + e.line);
  } else if (skippedBefore >= minGap) {
    markdownParts.push(`> **${skippedBefore} unchanged lines above**\n\n`);
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkLines = i === 0 ? [...leadingLines, ...chunks[i]] : chunks[i];
    if (i === chunks.length - 1 && skippedAfter > 0 && skippedAfter < minGap) {
      const trailingLines = edits
        .slice(lastShownIdx + 1)
        .map((e) => (e.type === " " ? "  " : e.type === "+" ? "+ " : "- ") + e.line);
      chunkLines.push(...trailingLines);
    }
    markdownParts.push("```diff\n" + chunkLines.join("\n") + "\n```\n");
    if (i < skippedCounts.length) {
      const count = skippedCounts[i];
      markdownParts.push(`\n> **${count} unchanged lines hidden**\n\n`);
    }
  }

  if (skippedAfter >= minGap) {
    markdownParts.push(`\n> **${skippedAfter} unchanged lines below**\n`);
  }

  const markdown = markdownParts.join("");

  return {
    markdown,
    fullDiff,
    additions,
    removals,
    originalFormatted,
    modifiedFormatted,
  };
};
