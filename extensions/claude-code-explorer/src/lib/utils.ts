import type { ContentBlock } from "./types";

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

export function extractTextContent(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;

  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text) {
      parts.push(block.text);
    } else if (block.type === "tool_use" && block.name) {
      parts.push(formatToolUse(block));
    }
  }
  return parts.join("\n\n");
}

const TOOL_DISPLAY_FIELD: Record<string, { field: string; code?: boolean }> = {
  Read: { field: "file_path", code: true },
  Write: { field: "file_path", code: true },
  Edit: { field: "file_path", code: true },
  Bash: { field: "command", code: true },
  Grep: { field: "pattern", code: true },
  Glob: { field: "pattern", code: true },
  Task: { field: "description" },
  Skill: { field: "skill" },
};

function formatToolUse(block: ContentBlock): string {
  const name = block.name ?? "unknown";
  const input = block.input as Record<string, unknown> | undefined;
  const rule = input ? TOOL_DISPLAY_FIELD[name] : undefined;
  const value = rule ? input?.[rule.field] : undefined;

  if (!value) return `> **${name}**`;

  const display = truncate(String(value), 80);
  return rule?.code
    ? `> **${name}** \`${display}\``
    : `> **${name}** ${display}`;
}

export function isToolResultOnly(content: string | ContentBlock[]): boolean {
  if (typeof content === "string") return false;
  return content.every((b) => b.type === "tool_result");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
