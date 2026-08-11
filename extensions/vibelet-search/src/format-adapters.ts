import type {
  ClaudeConversationLine,
  CodexConversationLine,
  SessionFormat,
  SessionMessage,
  SessionSource,
} from "./types";

/**
 * Parsed message extracted from a single JSONL line.
 * `null` means the line carries no user-visible message (e.g. tool result, session_meta).
 */
export type ParsedLine = SessionMessage | null;

/**
 * Single source of truth for "given a JSONL line from source X, extract the visible message".
 * All consumers (title extraction, full conversation load, content search snippets) go through here.
 */
export interface FormatAdapter {
  format: SessionFormat;
  parseLine(raw: unknown): ParsedLine;
}

function extractTextBlocks(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block: { type?: string; text?: string }) => {
      // Skip non-text blocks (tool calls, images, etc.)
      if (block.type === "tool_use" || block.type === "tool_result" || block.type === "input_image") {
        return "";
      }
      return block.text || "";
    })
    .filter(Boolean)
    .join("\n");
}

export const claudeAdapter: FormatAdapter = {
  format: "claude",
  parseLine(raw) {
    if (raw === null || typeof raw !== "object") return null;
    const line = raw as ClaudeConversationLine;
    if (line.type !== "user" && line.type !== "assistant") return null;
    if (!line.message?.content) return null;

    const text = extractTextBlocks(line.message.content);
    if (!text) return null;

    return {
      role: line.type,
      content: text,
      timestamp: line.timestamp || "",
    };
  },
};

export const codexAdapter: FormatAdapter = {
  format: "codex",
  parseLine(raw) {
    if (raw === null || typeof raw !== "object") return null;
    const line = raw as CodexConversationLine;

    // New format: { type: "response_item", payload: { type: "message", role, content } }
    if (line.type === "response_item" && line.payload?.type === "message" && line.payload.role) {
      // Codex Desktop emits role="developer" messages carrying internal protocol bits
      // ("<permissions instructions>", "Approved command prefix saved: ...") — never
      // part of the user-visible conversation. Drop anything outside user/assistant.
      if (line.payload.role !== "user" && line.payload.role !== "assistant") return null;
      const text = extractTextBlocks(line.payload.content);
      if (!text) return null;
      return {
        role: line.payload.role,
        content: text,
        timestamp: line.timestamp || "",
      };
    }

    // Old format: { type: "message", role, content }
    if (line.type === "message" && line.role && line.content) {
      if (line.role !== "user" && line.role !== "assistant") return null;
      const text = extractTextBlocks(line.content);
      if (!text) return null;
      return {
        role: line.role,
        content: text,
        timestamp: line.timestamp || "",
      };
    }

    return null;
  },
};

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
