import { SOURCE_BADGE, SOURCE_LABEL } from "./source-display";
import type { SessionMessage, SessionMeta } from "./types";

/**
 * Format a single message as a markdown chunk.
 * - User messages render as blockquote bubbles.
 * - Assistant messages render flat (they tend to be long).
 *
 * `truncate` clips long bodies for the on-screen detail view; pass Infinity for clipboard export.
 */
export function renderMessage(
  msg: SessionMessage,
  options: { query?: string; marker?: string; truncate?: number } = {},
): string {
  const { query, marker, truncate = Infinity } = options;
  const time = formatMessageTime(msg.timestamp);
  const timeStr = time ? ` · *${time}*` : "";
  const markerStr = marker ? `  ${marker}` : "";

  let content = msg.content.length > truncate ? msg.content.slice(0, truncate) + "\n\n*…(truncated)*" : msg.content;
  if (query) content = highlightMatch(content, query);

  if (msg.role === "user") {
    return `#### 👤 You${timeStr}${markerStr}\n\n${asBubble(content)}`;
  }
  return `#### 🤖 Assistant${timeStr}${markerStr}\n\n${content}`;
}

/**
 * Format a complete session as markdown — header + every message in order.
 * Used for both the detail view (with `truncate`) and clipboard export (without).
 */
export function formatSessionMarkdown(
  meta: SessionMeta,
  messages: SessionMessage[],
  options: { truncate?: number; query?: string } = {},
): string {
  const sourceLabel = SOURCE_LABEL[meta.source];
  const sourceBadge = SOURCE_BADGE[meta.source];
  const prSuffix = meta.prUrl ? ` · [PR #${meta.prNumber ?? ""}](${meta.prUrl})` : "";

  const header =
    `# ${sourceBadge} ${meta.title}\n\n` +
    `${sourceLabel} · \`${meta.projectPath}\` · ${new Date(meta.timestamp).toLocaleString()} · ${messages.length} messages${prSuffix}\n\n` +
    `---\n\n`;

  const body = messages.map((m) => renderMessage(m, options)).join("\n\n");
  return header + body;
}

/**
 * Format a session as plain text — easier to paste into notes/docs apps that don't render markdown.
 */
export function formatSessionPlainText(meta: SessionMeta, messages: SessionMessage[]): string {
  const sourceLabel = SOURCE_LABEL[meta.source];
  const lines: string[] = [
    `# ${meta.title}`,
    `Source: ${sourceLabel}`,
    `Project: ${meta.projectPath}`,
    `Time: ${new Date(meta.timestamp).toLocaleString()}`,
    `Messages: ${messages.length}`,
    "",
    "---",
    "",
  ];

  for (const msg of messages) {
    const role = msg.role === "user" ? "User" : "Assistant";
    const time = formatMessageTime(msg.timestamp);
    lines.push(time ? `## ${role} (${time})` : `## ${role}`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

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
 * Render each line of `text` as a blockquote ("> ...") so the user message looks like a bubble.
 */
export function asBubble(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/**
 * Format an ISO timestamp as "Mon DD HH:MM" in the user's locale.
 * Returns empty string if `ts` is missing or invalid.
 */
export function formatMessageTime(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
