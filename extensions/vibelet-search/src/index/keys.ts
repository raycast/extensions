import type { SessionMeta, SessionSource } from "../types";

/**
 * Stable identity key for a session, independent of the cli/app split:
 * `claude:<id>` or `codex:<id>`.
 *
 * This single key format is used by the meta cache, the merged meta map, the dirty
 * change sets, and the content-index segments — keep it consistent everywhere or
 * incremental rebuilds will miss sessions.
 */
export function sessionKeyOfSource(source: SessionSource, id: string): string {
  return `${source === "claude-cli" || source === "claude-app" ? "claude" : "codex"}:${id}`;
}

export function sessionKeyOf(meta: Pick<SessionMeta, "source" | "id">): string {
  return sessionKeyOfSource(meta.source, meta.id);
}
