import os from "node:os";
import path from "node:path";
import { AppError, ErrorCode } from "./errors";

/**
 * Expand a leading `~` to the user's home directory, then resolve to an absolute path.
 *
 * The path comes from a Raycast user preference, so it is already user-controlled.
 * `path.resolve` normalises any `..` segments, which makes traversal checks moot —
 * we just ensure the input is non-empty and produce a canonical absolute path.
 */
export function resolveWorkspacePath(raw: string | undefined | null): string {
  if (!raw || raw.trim() === "") {
    throw new AppError(ErrorCode.WORKSPACE_NOT_FOUND, "workspace path is not configured");
  }
  const trimmed = raw.trim();
  const expanded = trimmed.startsWith("~") ? path.join(os.homedir(), trimmed.slice(1).replace(/^[/\\]/, "")) : trimmed;
  return path.resolve(expanded);
}

export function sessionsDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "sessions");
}

export function sourcesDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "sources");
}

export function workspaceSkillsDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "skills");
}
