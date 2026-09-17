import type { ClaudeConversationLine } from "../types";
import { extractTextBlocks } from "./text-blocks";
import type { FormatAdapter } from "./types";

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
