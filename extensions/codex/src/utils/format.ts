import { homedir } from "node:os";
import { basename } from "node:path";

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1)}…`;
}

export function getProjectName(path: string): string {
  return basename(path) || path;
}

export function tildeifyPath(absolutePath: string): string {
  const home = homedir();
  if (absolutePath === home) return "~";
  return absolutePath.startsWith(home + "/")
    ? "~" + absolutePath.slice(home.length)
    : absolutePath;
}

export function formatTimestampSeconds(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

const compactTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatCompactTimestampSeconds(seconds: number): string {
  return compactTimestampFormatter.format(new Date(seconds * 1000));
}

export function formatCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

const compactTokenFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactTokens(tokens: number): string {
  return compactTokenFormatter.format(tokens);
}

export function getThreadDisplayTitle(thread: {
  name: string | null;
  preview: string;
  id: string;
}): string {
  const name = thread.name?.trim();
  if (name) return name;

  const firstPreviewLine = thread.preview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstPreviewLine ?? thread.id;
}

export function getThreadAgentLabel(thread: {
  agentNickname: string | null;
  agentRole: string | null;
}): string {
  const nickname = thread.agentNickname?.trim();
  const role = thread.agentRole?.trim();

  if (nickname && role) return `${nickname} (${role})`;
  return nickname || role || "";
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
