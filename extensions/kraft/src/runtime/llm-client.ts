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

export interface RaycastAIAskOptions {
  creativity?: "none" | "low" | "medium" | "high" | "maximum" | number;
  model?: string;
  signal?: AbortSignal;
}

export type RaycastAIStream = Promise<string> & {
  on(event: "data", listener: (chunk: string) => void): void;
};

export interface RaycastAIProvider {
  ask(prompt: string, options?: RaycastAIAskOptions): RaycastAIStream;
}

export interface StreamToolCompletionInput extends StreamChatInput {
  raycastAI?: RaycastAIProvider;
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

function formatRaycastConversationMessage(message: ConversationMessage): string {
  return `${message.role}: ${message.content}`;
}

export function buildRaycastAIPrompt(messages: ConversationMessage[]): string {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const nonSystemMessages = messages.filter((message) => message.role !== "system");
  let lastUserIndex = -1;
  for (let index = nonSystemMessages.length - 1; index >= 0; index -= 1) {
    if (nonSystemMessages[index].role === "user") {
      lastUserIndex = index;
      break;
    }
  }
  const finalUserMessage = lastUserIndex >= 0 ? nonSystemMessages[lastUserIndex] : undefined;
  const conversation = nonSystemMessages.filter((_, index) => index !== lastUserIndex);
  const sections: string[] = [];

  if (system) {
    sections.push(`System:\n${system}`);
  }
  if (conversation.length) {
    sections.push(`Conversation:\n${conversation.map(formatRaycastConversationMessage).join("\n")}`);
  }
  if (finalUserMessage) {
    sections.push(`User:\n${finalUserMessage.content}`);
  }

  return sections.join("\n\n");
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

async function getDefaultRaycastAIProvider(): Promise<RaycastAIProvider> {
  const { AI } = await import("@raycast/api");
  return {
    ask(prompt, options) {
      return AI.ask(prompt, options as never) as RaycastAIStream;
    },
  };
}

async function* streamRaycastAICompletion(input: StreamToolCompletionInput): AsyncGenerator<string> {
  const provider = input.raycastAI ?? (await getDefaultRaycastAIProvider());
  const options: RaycastAIAskOptions = {
    creativity: "none",
    signal: input.signal,
    ...(input.model ? { model: input.model } : {}),
  };
  const completion = provider.ask(buildRaycastAIPrompt(input.messages), options);
  const pending: string[] = [];
  let done = false;
  let failure: unknown;
  let sawDataEvent = false;
  let notify: (() => void) | undefined;

  function wake() {
    notify?.();
    notify = undefined;
  }

  completion.on("data", (chunk) => {
    if (!chunk) {
      return;
    }
    sawDataEvent = true;
    pending.push(chunk);
    wake();
  });
  completion.then(
    (text) => {
      if (!sawDataEvent && text) {
        pending.push(text);
      }
      done = true;
      wake();
    },
    (error) => {
      failure = error;
      done = true;
      wake();
    },
  );

  while (true) {
    if (pending.length) {
      yield pending.shift() ?? "";
      continue;
    }
    if (failure) {
      throw failure;
    }
    if (done) {
      return;
    }
    await new Promise<void>((resolve) => {
      notify = resolve;
    });
  }
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

export async function* streamToolCompletion(input: StreamToolCompletionInput): AsyncGenerator<string> {
  if (input.settings.apiCompatible === "raycast") {
    yield* streamRaycastAICompletion(input);
    return;
  }

  yield* streamChatCompletions(input);
}
