import type { CodexConversationLine } from "../types";
import { extractTextBlocks } from "./text-blocks";
import type { FormatAdapter } from "./types";

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
