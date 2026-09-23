import type { SessionMessage } from "../types";

/**
 * Find the index of the first message that contains `query` (case-insensitive).
 * Returns -1 if no match.
 */
export function findMatchIndex(messages: SessionMessage[], query: string): number {
  if (!query) return -1;
  const q = query.toLowerCase();
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].content.toLowerCase().includes(q)) return i;
  }
  return -1;
}

/**
 * Wrap each occurrence of `query` (case-insensitive) in **bold** for markdown rendering.
 */
export function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  let inFence = false;

  return text
    .split("\n")
    .map((line) => {
      const isFence = /^\s*(`{3,}|~{3,})/.test(line);
      if (isFence) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : line.replace(re, (m) => `**${m}**`);
    })
    .join("\n");
}

/**
 * Build a clean snippet around the matched query inside a matched line of text.
 */
export function buildSnippet(text: string, lowerQuery: string, queryLength: number): string {
  const idx = text.toLowerCase().indexOf(lowerQuery);
  if (idx === -1) return text.slice(0, 160).replace(/\s+/g, " ");
  const s = Math.max(0, idx - 50);
  const e = Math.min(text.length, idx + queryLength + 50);
  return (s > 0 ? "..." : "") + text.slice(s, e).replace(/\s+/g, " ") + (e < text.length ? "..." : "");
}

/**
 * Format an epoch ms timestamp as a relative time ("5m ago", "3d ago", "Nov 12 2024").
 */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
