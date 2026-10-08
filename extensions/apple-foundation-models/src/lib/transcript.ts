import { randomUUID } from "node:crypto";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

type TextContent = { type: "text"; text: string; id: string };

type TranscriptEntry =
  | { role: "instructions"; id: string; contents: TextContent[] }
  | {
      role: "user";
      id: string;
      contents: TextContent[];
      options: Record<string, never>;
      contextOptions: Record<string, never>;
    }
  | { role: "response"; id: string; contents: TextContent[] };

export interface TranscriptFile {
  modelName: "system";
  transcript: {
    type: "FoundationModels.Transcript";
    version: "1.1";
    transcript: { entries: TranscriptEntry[] };
  };
}

const id = () => randomUUID().toUpperCase();
const text = (value: string): TextContent[] => [{ type: "text", text: value, id: id() }];

/**
 * Builds the transcript JSON that `fm respond --resume` reads, so a chat can continue with the
 * history that fits the context window. The format matches what `fm respond --save-transcript` writes.
 */
export function buildTranscript(instructions: string | undefined, history: ChatMessage[]): TranscriptFile {
  const entries: TranscriptEntry[] = [];
  if (instructions?.trim()) {
    entries.push({ role: "instructions", id: id(), contents: text(instructions.trim()) });
  }
  for (const message of history) {
    if (message.role === "user") {
      entries.push({ role: "user", id: id(), contents: text(message.content), options: {}, contextOptions: {} });
    } else {
      entries.push({ role: "response", id: id(), contents: text(message.content) });
    }
  }
  return {
    modelName: "system",
    transcript: { type: "FoundationModels.Transcript", version: "1.1", transcript: { entries } },
  };
}
