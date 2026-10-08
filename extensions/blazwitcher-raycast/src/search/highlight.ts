import type { Range } from "../types";

export function normalizeRanges(ranges: Range[], length: number): Range[] {
  const sorted = ranges
    .map(([start, end]): Range => [
      Math.max(0, start),
      Math.min(length - 1, end),
    ])
    .filter(([start, end]) => start <= end)
    .sort((a, b) => a[0] - b[0]);
  const result: Range[] = [];
  for (const range of sorted) {
    const last = result.at(-1);
    if (last && range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1]);
    else result.push([...range]);
  }
  return result;
}
