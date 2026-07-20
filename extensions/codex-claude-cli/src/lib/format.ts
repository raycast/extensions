import { basename, dirname } from "node:path";
import { ChatProvider } from "./types";

export function providerName(provider: ChatProvider): string {
  return provider === "claude" ? "Claude" : "Codex";
}

export function projectName(cwd: string, sourcePath: string): string {
  if (cwd) return basename(cwd) || cwd;
  return basename(dirname(sourcePath)) || "No project";
}

export function compactText(value: string, maximumLength: number): string {
  const compacted = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (compacted.length <= maximumLength) return compacted;
  return `${compacted.slice(0, maximumLength - 1).trimEnd()}…`;
}
