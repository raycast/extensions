import { resolveBibleId } from "./translations";
import type { ChatCompletionChunk, ChatMessage, Preferences } from "./types";

const API_URL = "https://api.gamaliel.ai/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5.6-luna";
const MAX_USER_MESSAGES = 20;

export function countUserMessages(messages: ChatMessage[]): number {
  return messages.filter((message) => message.role === "user").length;
}

export function canAskFollowUp(messages: ChatMessage[]): boolean {
  return countUserMessages(messages) < MAX_USER_MESSAGES;
}

export async function streamAnswer(
  messages: ChatMessage[],
  preferences: Preferences,
  onUpdate: (markdown: string) => void,
): Promise<string> {
  if (countUserMessages(messages) > MAX_USER_MESSAGES) {
    throw new Error("This conversation reached Gamaliel’s 20-question limit. Start a new conversation.");
  }

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      theology: preferences.theology || "default",
      profile: preferences.profile || "universal_explorer",
      bible_id: resolveBibleId(preferences.bibleId),
      max_words: Number.parseInt(preferences.maxWords || "300", 10) || 300,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (!response.body) {
    throw new Error("Gamaliel returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      content = applySseLine(line, content, onUpdate);
    }
  }

  if (buffer.trim()) {
    content = applySseLine(buffer, content, onUpdate);
  }

  if (!content.trim()) {
    throw new Error("Gamaliel returned an empty answer. Try again in a moment.");
  }

  return content;
}

function applySseLine(line: string, content: string, onUpdate: (markdown: string) => void): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) {
    return content;
  }

  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") {
    return content;
  }

  let chunk: ChatCompletionChunk;
  try {
    chunk = JSON.parse(data) as ChatCompletionChunk;
  } catch {
    return content;
  }

  if (chunk.error?.message) {
    throw new Error(chunk.error.message);
  }

  const delta = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content;
  if (!delta) {
    return content;
  }

  const next = content + delta;
  onUpdate(next);
  return next;
}

async function readApiError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const body = JSON.parse(raw) as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    const message = body.error?.message || body.message;
    if (body.error?.code === "rate_limit_exceeded") {
      return "Gamaliel hosted access is rate-limited (3 requests/minute/IP). Wait a minute and try again.";
    }
    if (body.error?.code === "conversation_limit_exceeded") {
      return "This conversation reached Gamaliel’s 20-question limit. Start a new conversation.";
    }
    if (message) {
      return message;
    }
  } catch {
    // Fall through to the status text.
  }

  return `Gamaliel request failed (${response.status} ${response.statusText}).`;
}
