import { readFileSync } from "fs";
import { LocalStorage } from "@raycast/api";

export interface LastExchange {
  lastUserText: string | null;
  lastAssistantText: string | null;
}

interface ContentBlock {
  type?: string;
  text?: string;
}

function extractText(content: unknown): string | null {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const texts = (content as ContentBlock[])
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string);
    if (texts.length > 0) return texts.join("\n");
  }

  return null;
}

function parseLastExchange(filePath: string): LastExchange {
  const lines = readFileSync(filePath, "utf-8").split("\n");

  let lastUserText: string | null = null;
  let lastAssistantText: string | null = null;

  for (let i = lines.length - 1; i >= 0 && (lastUserText === null || lastAssistantText === null); i--) {
    const line = lines[i];
    if (!line.trim()) continue;

    let entry: { type?: string; message?: { content?: unknown } };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type === "user" && lastUserText === null) {
      lastUserText = extractText(entry.message?.content);
    } else if (entry.type === "assistant" && lastAssistantText === null) {
      lastAssistantText = extractText(entry.message?.content);
    }
  }

  return { lastUserText, lastAssistantText };
}

export async function getLastExchange(sessionId: string, filePath: string, mtimeMs: number): Promise<LastExchange> {
  const cacheKey = `transcript:${sessionId}:${mtimeMs}`;

  const cached = await LocalStorage.getItem<string>(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as LastExchange;
    } catch {
      // fall through and reparse
    }
  }

  const result = parseLastExchange(filePath);
  await LocalStorage.setItem(cacheKey, JSON.stringify(result));
  return result;
}
