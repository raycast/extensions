const UNITS: [seconds: number, label: string][] = [
  [60, "s"],
  [60 * 60, "m"],
  [60 * 60 * 24, "h"],
  [60 * 60 * 24 * 7, "d"],
  [60 * 60 * 24 * 30, "w"],
  [60 * 60 * 24 * 365, "mo"],
  [Infinity, "y"],
];

export function relativeTime(date: Date): string {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (elapsedSeconds < 60) return "just now";

  let previousThreshold = 60;
  for (const [threshold, label] of UNITS) {
    if (elapsedSeconds < threshold) {
      return `${Math.floor(elapsedSeconds / previousThreshold)}${label} ago`;
    }
    previousThreshold = threshold;
  }

  return `${Math.floor(elapsedSeconds / previousThreshold)}y ago`;
}
