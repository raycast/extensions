export function compareVersions(a: string, b: string): number {
  const left = a.split(".");
  const right = b.split(".");
  const len = Math.max(left.length, right.length);

  for (let i = 0; i < len; i++) {
    const diff = segmentValue(left[i]) - segmentValue(right[i]);
    if (diff !== 0) return diff;
  }

  return 0;
}

function segmentValue(segment = ""): number {
  const match = segment.match(/^\d+/);
  return match ? Number(match[0]) : 0;
}
