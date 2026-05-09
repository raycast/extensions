import { resolveAccessToken } from "./credentials.js";
import {
  complete,
  getModel,
  type AssistantMessage,
  type Context,
  type Model,
} from "@mariozechner/pi-ai";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: string; text?: string }>;
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  reasoning_effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  reasoning?: {
    effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  };
};

export type ChatCompletionChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: "assistant"; content?: string };
    finish_reason: string | null;
  }>;
};

export function normalizeMessageContent(
  content: ChatMessage["content"],
): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((part) => (part.type === "text" && part.text ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function makeFallbackPrompt(messages: ChatMessage[]): string {
  return messages
    .map(
      (message) =>
        `${message.role.toUpperCase()}: ${normalizeMessageContent(message.content)}`,
    )
    .join("\n\n");
}

function toContext(messages: ChatMessage[]): Context {
  const systemParts: string[] = [];
  const contextMessages: Context["messages"] = [];
  for (const message of messages) {
    const content = normalizeMessageContent(message.content);
    if (!content) {
      continue;
    }
    if (message.role === "system") {
      systemParts.push(content);
      continue;
    }
    if (message.role === "user") {
      contextMessages.push({ role: "user", content, timestamp: Date.now() });
    }
    if (message.role === "assistant") {
      contextMessages.push({
        role: "assistant",
        content: [{ type: "text", text: content }],
        api: "openai-codex-responses",
        provider: "openai-codex",
        model: "unknown",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        timestamp: Date.now(),
      });
    }
  }
  if (contextMessages.length === 0) {
    contextMessages.push({
      role: "user",
      content: makeFallbackPrompt(messages),
      timestamp: Date.now(),
    });
  }
  return {
    systemPrompt: systemParts.join("\n\n") || undefined,
    messages: contextMessages,
  };
}

function assistantText(message: AssistantMessage): string {
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("");
}

export async function createCompletion(
  request: ChatCompletionRequest,
): Promise<string> {
  const token = await resolveAccessToken();
  const model = getModel(
    "openai-codex",
    request.model as never,
  ) as Model<"openai-codex-responses">;
  if (!model) {
    throw new Error(`Unknown OpenAI Codex model: ${request.model}`);
  }
  const response = await complete(model, toContext(request.messages), {
    apiKey: token,
    temperature: request.temperature,
    maxTokens: request.max_tokens,
    reasoningEffort: request.reasoning_effort ?? request.reasoning?.effort,
  });
  if (response.stopReason === "error") {
    throw new Error(response.errorMessage ?? "OpenAI Codex completion failed.");
  }
  return assistantText(response);
}

export function makeChunk(params: {
  id: string;
  model: string;
  content?: string;
  finishReason?: string | null;
}): ChatCompletionChunk {
  return {
    id: params.id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: params.model,
    choices: [
      {
        index: 0,
        delta: params.content ? { content: params.content } : {},
        finish_reason: params.finishReason ?? null,
      },
    ],
  };
}
