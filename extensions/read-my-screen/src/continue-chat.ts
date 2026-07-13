import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import { chatWithHistoryOpenAI } from "./openai-vision";
import type { ParsedModel } from "./model";
import type { ModelResponse } from "./token-usage";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type SessionContext =
  | { source: "screen"; screenBase64: string; screenMediaType?: string }
  | { source: "browser" };

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string; code?: number };
};

/**
 * `messages` must be non-empty, end with a `user` message, and represent the full thread including the new follow-up.
 */
export async function continueConversation(
  prefs: Preferences,
  parsed: ParsedModel,
  session: SessionContext,
  messages: ChatTurn[],
): Promise<ModelResponse> {
  if (messages.length < 1 || messages[messages.length - 1].role !== "user") {
    throw new Error("Invalid conversation state.");
  }

  const { provider, modelId } = parsed;

  if (provider === "openai") {
    const key = prefs.openaiApiKey?.trim();
    if (!key) {
      throw new Error(`Add your OpenAI API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
    }
    return chatWithHistoryOpenAI(key, modelId, buildOpenAIMessages(session, messages));
  }

  if (provider === "anthropic") {
    const key = prefs.anthropicApiKey?.trim();
    if (!key) {
      throw new Error(`Add your Anthropic API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
    }
    return chatWithHistoryAnthropic(key, modelId, session, messages);
  }

  const key = prefs.geminiApiKey?.trim();
  if (!key) {
    throw new Error(`Add your Google Gemini API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
  }
  return chatWithHistoryGemini(key, modelId, session, messages);
}

function screenDataUrl(session: { screenBase64: string; screenMediaType?: string }): string {
  const mime = session.screenMediaType?.trim() || "image/png";
  return `data:${mime};base64,${session.screenBase64}`;
}

function buildOpenAIMessages(session: SessionContext, messages: ChatTurn[]): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = [];

  if (session.source === "screen") {
    const [first, ...rest] = messages;
    out.push({
      role: "user",
      content: [
        { type: "text", text: first.content },
        {
          type: "image_url",
          image_url: {
            url: screenDataUrl(session),
            detail: "auto",
          },
        },
      ],
    });
    for (const m of rest) {
      out.push({ role: m.role, content: m.content });
    }
  } else {
    for (const m of messages) {
      out.push({ role: m.role, content: m.content });
    }
  }

  return out;
}

function anthropicScreenMediaType(m: string | undefined): "image/png" | "image/jpeg" | "image/gif" | "image/webp" {
  switch (m) {
    case "image/jpeg":
    case "image/gif":
    case "image/webp":
    case "image/png":
      return m;
    default:
      return "image/png";
  }
}

function buildAnthropicMessages(session: SessionContext, messages: ChatTurn[]): unknown[] {
  if (session.source === "screen") {
    const [first, ...rest] = messages;
    const out: unknown[] = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: anthropicScreenMediaType(session.screenMediaType),
              data: session.screenBase64,
            },
          },
          { type: "text", text: first.content },
        ],
      },
    ];
    for (const m of rest) {
      if (m.role === "assistant") {
        out.push({ role: "assistant", content: m.content });
      } else {
        out.push({ role: "user", content: [{ type: "text", text: m.content }] });
      }
    }
    return out;
  }

  return messages.map((m) =>
    m.role === "assistant"
      ? { role: "assistant", content: m.content }
      : { role: "user", content: [{ type: "text", text: m.content }] },
  );
}

async function chatWithHistoryAnthropic(
  apiKey: string,
  model: string,
  session: SessionContext,
  messages: ChatTurn[],
): Promise<ModelResponse> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: buildAnthropicMessages(session, messages),
    }),
  });

  const data = (await res.json()) as AnthropicResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || `HTTP ${res.status}`);
  }
  const parts = data.content;
  if (!parts?.length) {
    throw new Error("The model returned an empty response.");
  }
  const text = parts.map((p) => (p.type === "text" && p.text ? p.text : "")).join("");
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("The model returned an empty response.");
  }
  const usage =
    data.usage?.input_tokens != null || data.usage?.output_tokens != null
      ? { input: data.usage?.input_tokens, output: data.usage?.output_tokens }
      : undefined;
  return { text: trimmed, usage };
}

function buildGeminiContents(session: SessionContext, messages: ChatTurn[]): unknown[] {
  if (session.source === "screen") {
    const [first, ...rest] = messages;
    const mimeType = session.screenMediaType?.trim() || "image/png";
    const contents: unknown[] = [
      {
        role: "user",
        parts: [{ text: first.content }, { inlineData: { mimeType, data: session.screenBase64 } }],
      },
    ];
    for (const m of rest) {
      const role = m.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: m.content }] });
    }
    return contents;
  }

  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

async function chatWithHistoryGemini(
  apiKey: string,
  model: string,
  session: SessionContext,
  messages: ChatTurn[],
): Promise<ModelResponse> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: buildGeminiContents(session, messages),
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || `HTTP ${res.status}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("The model returned an empty response.");
  }
  const um = data.usageMetadata;
  const usage =
    um && (um.promptTokenCount != null || um.candidatesTokenCount != null || um.totalTokenCount != null)
      ? {
          input: um.promptTokenCount,
          output: um.candidatesTokenCount,
          total: um.totalTokenCount,
        }
      : undefined;
  return { text: trimmed, usage };
}
