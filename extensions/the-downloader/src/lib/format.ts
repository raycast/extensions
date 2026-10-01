/** Decimal units, like Finder and Explorer report file sizes. */
const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "—";
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

export function formatSpeed(bytesPerSecond: number | undefined): string {
  return bytesPerSecond === undefined ? "—" : `${formatBytes(bytesPerSecond)}/s`;
}

/** `m:ss`, or `h:mm:ss` from an hour on. */
export function formatClock(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Split text into at most `maxLines` lines of roughly `maxChars`, ending with an ellipsis if it was cut. */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const used = lines.join(" ").length;
  if (lines.length === maxLines && used < text.replace(/\s+/g, " ").trim().length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }
  return lines;
}

/** One-line progress for a toast: `42% · 5.20 MB/s · 0:12 left`, skipping whatever yt-dlp didn't report. */
export function progressMessage(p: { percent?: number; speed?: number; eta?: number }): string {
  const parts: string[] = [];
  if (p.percent !== undefined) parts.push(`${Math.floor(p.percent)}%`);
  if (p.speed !== undefined) parts.push(formatSpeed(p.speed));
  if (p.eta !== undefined) parts.push(`${formatClock(p.eta)} left`);
  return parts.join(" · ");
}

/**
 * Backslash-escape Markdown syntax so text from a site (a video title, say)
 * renders as plain text — a `[title](url)` can't become a link.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&");
}

/**
 * Markdown from an untrusted source (an AI answer a web page could steer)
 * without images: Raycast loads them by itself, so one could carry chat text to
 * any server or make this Mac request a local address. Inline and reference
 * images become their alt text; image-like HTML tags are dropped. Links stay —
 * they only open when clicked.
 */
export function withoutImages(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<(img|picture|source|video|audio|iframe|object|embed)\b[^>]*>/gi, "");
}
