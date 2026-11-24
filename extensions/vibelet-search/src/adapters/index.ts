import type { SessionFormat, SessionSource } from "../types";
import { claudeAdapter } from "./claude";
import { codexAdapter } from "./codex";
import type { FormatAdapter, ParsedLine } from "./types";

export { claudeAdapter, codexAdapter };
export { extractTextBlocks } from "./text-blocks";
export type { FormatAdapter, ParsedLine };

export function getFormatForSource(source: SessionSource): SessionFormat {
  return source === "claude-cli" || source === "claude-app" ? "claude" : "codex";
}

export function getAdapter(sourceOrFormat: SessionSource | SessionFormat): FormatAdapter {
  if (sourceOrFormat === "claude" || sourceOrFormat === "codex") {
    return sourceOrFormat === "claude" ? claudeAdapter : codexAdapter;
  }
  return getFormatForSource(sourceOrFormat) === "claude" ? claudeAdapter : codexAdapter;
}

/**
 * Heuristic: is this user message a real user input vs system/env context?
 *
 * Used by:
 * - Title extraction (skip AGENTS.md / env context to find the real first prompt)
 * - Conversation rendering (hide auto-injected events from the chat view)
 * - Content-index segments (must stay in lock-step with conversation rendering so that
 *   a segment line number always equals `loadSessionMessages`' array index — see
 *   `content-index.ts`' seq contract)
 *
 * Returning false means "not user-authored; suppress from display".
 */
export function isMeaningfulUserMessage(text: string): boolean {
  const trimmed = text.trim();
  // No length-based filtering here: short messages like "ok" / "要" are real replies that
  // should still appear in the conversation view. Callers that want a length floor (e.g.
  // title extraction) apply it themselves.
  if (!trimmed) return false;

  // AGENTS.md / CLAUDE.md / system instructions auto-prepended at session start
  if (/^#\s*(AGENTS|CLAUDE)\.md/i.test(trimmed)) return false;

  // Auto-injected XML-style wrapper tags. Claude Code surfaces hook output, slash-command
  // bodies, background task notifications and similar as user-role messages wrapped in
  // one of these tags — none of them are user-typed.
  if (
    /^<(system-reminder|environment_context|command-message|command-name|command-args|task-notification|local-command-stdout|local-command-stderr|user-prompt-submit-hook|bash-input|bash-stdout|bash-stderr)[\s>]/.test(
      trimmed,
    )
  ) {
    return false;
  }

  // "Caveat: ..." prefix is auto-prepended when a session is resumed with extra context
  if (trimmed.startsWith("Caveat:")) return false;

  // Auto-injected when the user presses ESC during a tool call
  if (/^\[Request interrupted by user(?: for tool use)?\]$/.test(trimmed)) return false;

  // Lone image-only message (no accompanying user text)
  if (/^\[Image:[^\]]*\]$/.test(trimmed)) return false;

  return true;
}

/**
 * Clean up a title string: strip leading wrapper tags, take first non-empty line, truncate.
 */
export function cleanTitle(text: string): string {
  const stripped = text.trim().replace(/^<[^>]+>\s*/, "");
  const firstLine = stripped
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (firstLine || stripped).slice(0, 120);
}
