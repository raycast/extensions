const pad = (n: number) => String(n).padStart(2, "0");

function parts(seconds: number) {
  const total = Math.floor(seconds);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

// 17:28 or 1:02:03 — for headings in notes.md.
export function formatTimecode(seconds: number): string {
  const { h, m, s } = parts(seconds);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// 00-17-28 — for file names, so frames sort by time.
export function timecodeSlug(seconds: number): string {
  const { h, m, s } = parts(seconds);
  return `${pad(h)}-${pad(m)}-${pad(s)}`;
}

export function parseTimecode(value: string): number {
  return value.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}
