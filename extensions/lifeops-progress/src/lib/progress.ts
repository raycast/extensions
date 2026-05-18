export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function percent(current: number, start: number, goal: number): number {
  // Handles both increasing and decreasing goals.
  const denom = goal - start;
  if (denom === 0) return 100;
  return clamp(((current - start) / denom) * 100, 0, 100);
}

export function blocks(pct: number, total = 10): string {
  const filled = Math.round((clamp(pct, 0, 100) / 100) * total);
  return "■".repeat(filled) + "□".repeat(total - filled);
}
