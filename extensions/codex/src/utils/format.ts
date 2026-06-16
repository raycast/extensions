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

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
