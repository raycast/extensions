import { createParser } from "eventsource-parser";
import { ProxyAgent } from "proxy-agent";
import { ApiSettings } from "./api-settings";
import { buildCompatibleUrl, getCompatibilityProfile } from "./api-compatibility";
import { requestHeaders } from "./model-list";
import { ConversationMessage } from "./tool-runtime";
import { fetchSSE } from "./http";

export interface StreamChatInput {
  settings: ApiSettings;
  model: string;
  messages: ConversationMessage[];
  signal: AbortSignal;
  agent?: InstanceType<typeof ProxyAgent>;
}

function parseOpenAIDelta(data: string): string | undefined {
  if (data === "[DONE]") {
    return undefined;
  }

  const payload = JSON.parse(data);
  const choice = payload.choices?.[0];
  if (!choice || choice.finish_reason) {
    return undefined;
  }
  return choice.delta?.content ?? "";
}

function parseClaudeDelta(data: string): string | undefined {
  const payload = JSON.parse(data);
  if (payload.type !== "content_block_delta") {
    return undefined;
  }
  if (payload.delta?.type !== "text_delta") {
    return undefined;
  }
  return payload.delta.text ?? "";
}

function splitMessagesForClaude(messages: ConversationMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
  return { system, conversation };
}

export function buildChatRequestBody(input: StreamChatInput, stream: boolean): Record<string, unknown> {
  if (input.settings.apiCompatible === "claude") {
    const { system, conversation } = splitMessagesForClaude(input.messages);
    return {
      model: input.model,
      max_tokens: 1024,
      ...(system ? { system } : {}),
      messages: conversation,
      stream,
    };
  }

  return {
    model: input.model,
    messages: input.messages,
    temperature: 0,
    stream,
  };
}

export function parseChatResponse(settings: ApiSettings, payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  if (settings.apiCompatible === "claude") {
    if (!("content" in payload) || !Array.isArray(payload.content)) {
      return "";
    }
    return payload.content
      .map((item) => {
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("");
  }
  if (!("choices" in payload) || !Array.isArray(payload.choices)) {
    return "";
  }
  const first = payload.choices[0];
  if (!first || typeof first !== "object" || !("message" in first)) {
    return "";
  }
  const message = first.message;
  if (!message || typeof message !== "object" || !("content" in message) || typeof message.content !== "string") {
    return "";
  }
  return message.content;
}

export function buildChatUrl(settings: ApiSettings): string {
  const profile = getCompatibilityProfile(settings.apiCompatible);
  return buildCompatibleUrl(settings.apiBase, profile.chatPath);
}

export async function* streamChatCompletions(input: StreamChatInput): AsyncGenerator<string> {
  const url = buildChatUrl(input.settings);
  const decoder = new TextDecoder();
  const events: string[] = [];
  const parser = createParser((event) => {
    if (event.type === "event") {
      events.push(event.data);
    }
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...requestHeaders(input.settings),
  };

  for await (const chunk of fetchSSE(url, {
    method: "POST",
    body: JSON.stringify(buildChatRequestBody(input, true)),
    headers,
    signal: input.signal,
    agent: input.agent as never,
  })) {
    events.length = 0;
    parser.feed(decoder.decode(chunk as ArrayBuffer));
    for (const event of events) {
      const delta = input.settings.apiCompatible === "claude" ? parseClaudeDelta(event) : parseOpenAIDelta(event);
      if (delta) {
        yield delta;
      }
    }
  }
}
