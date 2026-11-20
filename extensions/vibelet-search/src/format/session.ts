import { SOURCE_BADGE, SOURCE_LABEL } from "../source-display";
import type { SessionMessage, SessionMeta } from "../types";
import { highlightMatch } from "./highlight";

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
