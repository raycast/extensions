export interface DurationStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  stddev: number;
  total: number;
}

/** Compute duration statistics over a set of elapsed-second values (ignores non-positive/NaN). */
export function durationStats(values: number[]): DurationStats | null {
  const nums = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (nums.length === 0) return null;

  const count = nums.length;
  const total = nums.reduce((a, b) => a + b, 0);
  const mean = total / count;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / count;

  return {
    count,
    min: nums[0],
    max: nums[count - 1],
    mean,
    median: percentile(nums, 50),
    p90: percentile(nums, 90),
    stddev: Math.sqrt(variance),
    total,
  };
}

/** Linear-interpolated percentile of an already-sorted ascending array. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Count occurrences, returned as [value, count] pairs sorted by count descending. */
export function tally(items: string[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
